import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody, parseQuery } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { resolveCompanyId } from "../lib/company";
import { AuditAction, LedgerOperation, Prisma, UserRole } from "@prisma/client";

const SplitSchema = z.object({
  chartAccountId: z.string().min(1),
  costCenterId: z.string().optional().nullable(),
  splitAmount: z.number(),
});

const EntrySchema = z.object({
  issueDate: z.string().or(z.date()),
  paymentDate: z.string().or(z.date()).nullable().optional(),
  accountId: z.string().min(1),
  documentType: z.string().nullable().optional(),
  documentNumber: z.string().nullable().optional(),
  checkNumber: z.string().nullable().optional(),
  entityCode: z.string().nullable().optional(),
  amount: z.number(),
  operation: z.nativeEnum(LedgerOperation),
  history: z.string().nullable().optional(),
  printOnClose: z.boolean().optional(),
  confirmed: z.boolean().optional(),
  splits: z.array(SplitSchema).default([]),
});

const ListQuery = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  accountId: z.string().optional(),
  operation: z.nativeEnum(LedgerOperation).optional(),
  confirmed: z.coerce.boolean().optional(),
  deleted: z.coerce.boolean().optional().default(false),
  withSplits: z.coerce.boolean().optional().default(false),
});

export async function ledgerRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(ListQuery, request.query);

      const where: Prisma.BankLedgerEntryWhereInput = {
        companyId,
        ...(q.dateFrom || q.dateTo
          ? {
              issueDate: {
                ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
                ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
              },
            }
          : {}),
        ...(q.accountId ? { accountId: q.accountId } : {}),
        ...(q.operation ? { operation: q.operation } : {}),
        ...(q.confirmed === undefined ? {} : { confirmed: q.confirmed }),
        ...(q.deleted ? { deletedAt: { not: null } } : { deletedAt: null }),
      };

      return prisma.bankLedgerEntry.findMany({
        where,
        orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
        include: {
          account: true,
          splits: q.withSplits
            ? { include: { chartAccount: true, costCenter: true } }
            : false,
        },
      });
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const data = parseBody(EntrySchema, request.body);

      if (data.confirmed) {
        const totalSplits = data.splits.reduce((sum, s) => sum + s.splitAmount, 0);
        if (Math.abs(totalSplits - data.amount) > 0.01) {
          throw Object.assign(new Error("SPLITS_TOTAL_MUST_MATCH_AMOUNT"), { statusCode: 400 });
        }
      }

      const created = await prisma.$transaction(async (tx) => {
        const lastCode = await tx.bankLedgerEntry.aggregate({
          where: { companyId },
          _max: { code: true },
        });
        const nextCode = (lastCode._max.code ?? 0) + 1;

        const entry = await tx.bankLedgerEntry.create({
          data: {
            companyId,
            code: nextCode,
            issueDate: typeof data.issueDate === "string" ? new Date(data.issueDate) : data.issueDate,
            paymentDate: data.paymentDate ? (typeof data.paymentDate === "string" ? new Date(data.paymentDate) : data.paymentDate) : null,
            accountId: data.accountId,
            documentType: data.documentType ?? null,
            documentNumber: data.documentNumber ?? null,
            checkNumber: data.checkNumber ?? null,
            entityCode: data.entityCode ?? null,
            amount: data.amount,
            operation: data.operation,
            history: data.history ?? null,
            printOnClose: data.printOnClose ?? false,
            confirmed: data.confirmed ?? false,
            updatedById: request.user.sub,
          },
        });

        if (data.splits.length) {
          await tx.bankLedgerEntrySplit.createMany({
            data: data.splits.map((s) => ({
              entryId: entry.id,
              chartAccountId: s.chartAccountId,
              costCenterId: s.costCenterId ?? null,
              splitAmount: s.splitAmount,
            })),
          });
        }

        await tx.auditLog.create({
          data: {
            companyId,
            userId: request.user.sub,
            entity: "LEDGER_ENTRY",
            entityId: entry.id,
            action: AuditAction.CREATE,
            oldJson: null,
            newJson: JSON.stringify(entry),
          },
        });

        return entry;
      });

      reply.status(201);
      return created;
    }
  );

  app.put(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const data = parseBody(EntrySchema, request.body);

      if (data.confirmed) {
        const totalSplits = data.splits.reduce((sum, s) => sum + s.splitAmount, 0);
        if (Math.abs(totalSplits - data.amount) > 0.01) {
          throw Object.assign(new Error("SPLITS_TOTAL_MUST_MATCH_AMOUNT"), { statusCode: 400 });
        }
      }

      const existing = await prisma.bankLedgerEntry.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });

      const updated = await prisma.$transaction(async (tx) => {
        const entry = await tx.bankLedgerEntry.update({
          where: { id: params.id },
          data: {
            issueDate: typeof data.issueDate === "string" ? new Date(data.issueDate) : data.issueDate,
            paymentDate: data.paymentDate ? (typeof data.paymentDate === "string" ? new Date(data.paymentDate) : data.paymentDate) : null,
            accountId: data.accountId,
            documentType: data.documentType ?? null,
            documentNumber: data.documentNumber ?? null,
            checkNumber: data.checkNumber ?? null,
            entityCode: data.entityCode ?? null,
            amount: data.amount,
            operation: data.operation,
            history: data.history ?? null,
            printOnClose: data.printOnClose ?? false,
            confirmed: data.confirmed ?? false,
            updatedById: request.user.sub,
          },
        });

        await tx.bankLedgerEntrySplit.deleteMany({ where: { entryId: params.id } });
        if (data.splits.length) {
          await tx.bankLedgerEntrySplit.createMany({
            data: data.splits.map((s) => ({
              entryId: entry.id,
              chartAccountId: s.chartAccountId,
              costCenterId: s.costCenterId ?? null,
              splitAmount: s.splitAmount,
            })),
          });
        }

        await tx.auditLog.create({
          data: {
            companyId,
            userId: request.user.sub,
            entity: "LEDGER_ENTRY",
            entityId: entry.id,
            action: AuditAction.UPDATE,
            oldJson: JSON.stringify(existing),
            newJson: JSON.stringify(entry),
          },
        });

        return entry;
      });

      return updated;
    }
  );

  app.post(
    "/:id/confirm",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = parseBody(z.object({ confirmed: z.boolean() }), request.body);

      const entry = await prisma.bankLedgerEntry.findUnique({ where: { id: params.id } });
      if (!entry) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (entry.companyId !== companyId) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });

      if (body.confirmed) {
        const splitsTotal = await prisma.bankLedgerEntrySplit.aggregate({
          where: { entryId: params.id },
          _sum: { splitAmount: true },
        });
        const total = splitsTotal._sum.splitAmount ?? 0;
        if (Math.abs(total - entry.amount) > 0.01) {
          throw Object.assign(new Error("CANNOT_CONFIRM_SPLITS_MISMATCH"), { statusCode: 400 });
        }
      }

      const updated = await prisma.bankLedgerEntry.update({
        where: { id: params.id },
        data: { confirmed: body.confirmed, updatedById: request.user.sub },
      });

      await prisma.auditLog.create({
        data: {
          companyId,
          userId: request.user.sub,
          entity: "LEDGER_ENTRY",
          entityId: params.id,
          action: AuditAction.CONFIRM,
          oldJson: JSON.stringify({ confirmed: entry.confirmed }),
          newJson: JSON.stringify({ confirmed: body.confirmed }),
        },
      });

      return updated;
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const entry = await prisma.bankLedgerEntry.findUnique({ where: { id: params.id } });
      if (!entry) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (entry.companyId !== companyId) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });

      const updated = await prisma.bankLedgerEntry.update({
        where: { id: params.id },
        data: { deletedAt: new Date(), updatedById: request.user.sub },
      });

      await prisma.auditLog.create({
        data: {
          companyId,
          userId: request.user.sub,
          entity: "LEDGER_ENTRY",
          entityId: params.id,
          action: AuditAction.DELETE,
          oldJson: JSON.stringify(entry),
          newJson: JSON.stringify({ deletedAt: updated.deletedAt }),
        },
      });

      return { message: "Entry deleted" };
    }
  );
}
