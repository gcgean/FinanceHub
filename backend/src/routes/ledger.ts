import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { parseBody, parseQuery } from "../lib/validation.js";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth.js";
import { resolveCompanyId } from "../lib/company.js";
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

const QueryBoolean = z.preprocess((v) => {
  if (v === "true" || v === true || v === 1 || v === "1") return true;
  if (v === "false" || v === false || v === 0 || v === "0") return false;
  return v;
}, z.boolean());

const validDate = z.string().refine(
  (v) => !isNaN(new Date(v).getTime()),
  { message: "Invalid date format" }
).optional();

const ListQuery = z.object({
  dateFrom: validDate,
  dateTo: validDate,
  dateField: z.enum(["issueDate", "paymentDate"]).optional().default("issueDate"),
  accountId: z.string().optional(),
  operation: z.nativeEnum(LedgerOperation).optional(),
  confirmed: QueryBoolean.optional(),
  deleted: QueryBoolean.optional().default(false),
  withSplits: QueryBoolean.optional().default(false),
  take: z.coerce.number().int().min(1).max(500).optional().default(200),
  skip: z.coerce.number().int().min(0).optional().default(0),
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
              [q.dateField]: {
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

      const [items, total] = await Promise.all([
        prisma.bankLedgerEntry.findMany({
          where,
          orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
          take: q.take,
          skip: q.skip,
          include: {
            account: true,
            chartAccount: true,
            costCenter: true,
            splits: q.withSplits
              ? { include: { chartAccount: true, costCenter: true } }
              : false,
          },
        }),
        prisma.bankLedgerEntry.count({ where }),
      ]);
      return { items, total, take: q.take, skip: q.skip };
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
        const firstSplit = data.splits[0];

        const entry = await tx.bankLedgerEntry.create({
          data: {
            companyId,
            code: nextCode,
            issueDate: typeof data.issueDate === "string" ? new Date(data.issueDate) : data.issueDate,
            paymentDate: data.paymentDate ? (typeof data.paymentDate === "string" ? new Date(data.paymentDate) : data.paymentDate) : null,
            accountId: data.accountId,
            chartAccountId: firstSplit?.chartAccountId ?? null,
            costCenterId: firstSplit?.costCenterId ?? null,
            documentType: data.documentType ?? null,
            documentNumber: data.documentNumber ?? null,
            checkNumber: data.checkNumber ?? null,
            entityCode: data.entityCode ?? null,
            amount: data.amount,
            operation: data.operation,
            history: data.history ?? null,
            printOnClose: data.printOnClose ?? false,
            confirmed: data.confirmed ?? false,
            // updatedById: request.user.sub, // Removed to avoid FK error if user doesn't exist
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


        const user = await tx.user.findUnique({ where: { id: request.user.sub } });

        await tx.auditLog.create({
          data: {
            companyId,
            userId: user ? request.user.sub : null,
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
        const user = await tx.user.findUnique({ where: { id: request.user.sub } });

        const entry = await tx.bankLedgerEntry.update({
          where: { id: params.id },
          data: {
            chartAccountId: data.splits[0]?.chartAccountId ?? null,
            costCenterId: data.splits[0]?.costCenterId ?? null,
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
            updatedById: user ? request.user.sub : null,
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
            userId: user ? request.user.sub : null,
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

      const user = await prisma.user.findUnique({ where: { id: request.user.sub } });

      const updated = await prisma.bankLedgerEntry.update({
        where: { id: params.id },
        data: { confirmed: body.confirmed, updatedById: user ? request.user.sub : null },
      });

      await prisma.auditLog.create({
        data: {
          companyId,
          userId: user ? request.user.sub : null,
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

  // ── Import endpoint: accepts external codes (accountCode / costCenterCode)
  // and performs idempotent upsert using externalId as documentNumber key.
  app.post(
    "/import",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);

      const ImportSchema = z.object({
        accountCode:    z.string().min(1),
        costCenterCode: z.string().nullable().optional(),
        externalId:     z.string().min(1),
        issueDate:      z.string(),
        paymentDate:    z.string().nullable().optional(),
        amount:         z.number(),
        operation:      z.nativeEnum(LedgerOperation),
        history:        z.string().nullable().optional(),
      });

      const data = parseBody(ImportSchema, request.body);

      // Idempotency: if an entry with this externalId already exists, skip silently
      const existing = await prisma.bankLedgerEntry.findFirst({
        where: { companyId, documentNumber: data.externalId },
      });
      if (existing) {
        reply.status(200);
        return { ...existing, changed: false };
      }

      // Resolve account by externalCode (set during SyncAccounts)
      const account = await prisma.account.findFirst({
        where: { companyId, externalCode: data.accountCode },
      });
      if (!account) {
        throw Object.assign(
          new Error(`ACCOUNT_NOT_FOUND: externalCode=${data.accountCode}`),
          { statusCode: 422 }
        );
      }

      // Resolve cost center (optional) – store reference in history if found
      let historyStr = data.history ?? null;
      let resolvedCostCenterId: string | null = null;
      if (data.costCenterCode) {
        const cc = await prisma.costCenter.findFirst({
          where: { companyId, externalCode: data.costCenterCode },
        });
        resolvedCostCenterId = cc?.id ?? null;
        const label = cc ? cc.code : data.costCenterCode;
        historyStr = `[CC:${label}] ${historyStr ?? ""}`.trim();
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
            code:           nextCode,
            issueDate:      new Date(data.issueDate),
            paymentDate:    data.paymentDate ? new Date(data.paymentDate) : null,
            accountId:      account.id,
            costCenterId:   resolvedCostCenterId,
            documentNumber: data.externalId,
            amount:         data.amount,
            operation:      data.operation,
            history:        historyStr,
            confirmed:      false,
          },
        });

        const user = await tx.user.findUnique({ where: { id: request.user.sub } });
        await tx.auditLog.create({
          data: {
            companyId,
            userId:   user ? request.user.sub : null,
            entity:   "LEDGER_ENTRY",
            entityId: entry.id,
            action:   AuditAction.CREATE,
            oldJson:  null,
            newJson:  JSON.stringify(entry),
          },
        });

        return entry;
      });

      reply.status(201);
      return { ...created, changed: true };
    }
  );

  // -------------------------------------------------------------------------
  // POST /ledger/import-split
  // Recebe o rateio de um lançamento (lancamentos_centro_custo) e cria/atualiza
  // o BankLedgerEntrySplit correspondente.
  // Payload: { externalId, chartAccountCode, splitAmount }
  // -------------------------------------------------------------------------
  app.post(
    "/import-split",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);

      const ImportSplitSchema = z.object({
        externalId:       z.string().min(1),
        chartAccountCode: z.string().min(1),
        splitAmount:      z.number(),
      });

      const data = parseBody(ImportSplitSchema, request.body);
      const normalizedChartAccountCode = data.chartAccountCode.trim();

      // Localiza o lançamento pelo externalId (salvo como documentNumber no import)
      const entry = await prisma.bankLedgerEntry.findFirst({
        where: { companyId, documentNumber: data.externalId },
        select: { id: true, chartAccountId: true },
      });
      if (!entry) {
        throw Object.assign(
          new Error(`ENTRY_NOT_FOUND: externalId=${data.externalId}`),
          { statusCode: 422 }
        );
      }

      // Localiza o plano de contas pelo código (empresa ou global)
      const chartAccount = await prisma.chartAccount.findFirst({
        where: {
          OR: [
            { companyId, code: normalizedChartAccountCode },
            { companyId: null, code: normalizedChartAccountCode },
          ],
        },
        select: { id: true },
      });
      if (!chartAccount) {
        throw Object.assign(
          new Error(`CHART_ACCOUNT_NOT_FOUND: code=${normalizedChartAccountCode}`),
          { statusCode: 422 }
        );
      }

      const existingSplit = await prisma.bankLedgerEntrySplit.findUnique({
        where: {
          entryId_chartAccountId: {
            entryId: entry.id,
            chartAccountId: chartAccount.id,
          },
        },
      });

      if (existingSplit && Math.abs(existingSplit.splitAmount - data.splitAmount) < 0.0001) {
        if (entry.chartAccountId !== chartAccount.id) {
          await prisma.bankLedgerEntry.update({
            where: { id: entry.id },
            data: { chartAccountId: chartAccount.id },
          });
        }
        reply.status(200);
        return { ...existingSplit, changed: false };
      }

      // Upsert: cria ou atualiza o split (chave: entryId + chartAccountId)
      const split = await prisma.bankLedgerEntrySplit.upsert({
        where: {
          entryId_chartAccountId: {
            entryId:        entry.id,
            chartAccountId: chartAccount.id,
          },
        },
        create: {
          entryId:        entry.id,
          chartAccountId: chartAccount.id,
          splitAmount:    data.splitAmount,
        },
        update: {
          splitAmount: data.splitAmount,
        },
      });

      await prisma.bankLedgerEntry.update({
        where: { id: entry.id },
        data: {
          chartAccountId: chartAccount.id,
        },
      });

      reply.status(200);
      return { ...split, changed: true };
    }
  );

  // -------------------------------------------------------------------------
  // GET /ledger/splits — lançamentos do centro de custos (splits)
  // -------------------------------------------------------------------------
  app.get(
    "/splits",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);

      const SplitsQuery = z.object({
        dateFrom:       validDate,
        dateTo:         validDate,
        dateField:      z.enum(["issueDate", "paymentDate"]).optional().default("issueDate"),
        accountId:      z.string().optional(),
        chartAccountId: z.string().optional(),
        take: z.coerce.number().int().min(1).max(500).optional().default(200),
        skip: z.coerce.number().int().min(0).optional().default(0),
      });

      const q = parseQuery(SplitsQuery, request.query);

      const entryWhere: Prisma.BankLedgerEntryWhereInput = {
        companyId,
        deletedAt: null,
        ...(q.dateFrom || q.dateTo
          ? {
              [q.dateField]: {
                ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
                ...(q.dateTo   ? { lte: new Date(q.dateTo)   } : {}),
              },
            }
          : {}),
        ...(q.accountId ? { accountId: q.accountId } : {}),
      };

      const splitWhere: Prisma.BankLedgerEntrySplitWhereInput = {
        entry: entryWhere,
        ...(q.chartAccountId ? { chartAccountId: q.chartAccountId } : {}),
      };

      const [items, total] = await Promise.all([
        prisma.bankLedgerEntrySplit.findMany({
          where: splitWhere,
          orderBy: [{ entry: { [q.dateField]: "desc" } }, { entry: { createdAt: "desc" } }],
          take: q.take,
          skip: q.skip,
          include: {
            chartAccount: { select: { id: true, code: true, description: true } },
            costCenter:   { select: { id: true, code: true, description: true } },
            entry: {
              select: {
                id: true, code: true, issueDate: true, paymentDate: true,
                history: true, operation: true, confirmed: true, amount: true,
                account: { select: { id: true, code: true, description: true } },
              },
            },
          },
        }),
        prisma.bankLedgerEntrySplit.count({ where: splitWhere }),
      ]);

      return { items, total, take: q.take, skip: q.skip };
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

      const user = await prisma.user.findUnique({ where: { id: request.user.sub } });

      const updated = await prisma.bankLedgerEntry.update({
        where: { id: params.id },
        data: { deletedAt: new Date(), updatedById: user ? request.user.sub : null },
      });

      await prisma.auditLog.create({
        data: {
          companyId,
          userId: user ? request.user.sub : null,
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
