import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody, parseQuery } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { TransactionStatus, TransactionType, UserRole } from "@prisma/client";

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  status: z.nativeEnum(TransactionStatus).optional(),
  type: z.nativeEnum(TransactionType).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const TxBody = z.object({
  companyId: z.string().optional().nullable(),
  date: z.string().min(1),
  description: z.string().min(1),
  value: z.number(),
  type: z.nativeEnum(TransactionType),
  category: z.string(),
  categoryConfidence: z.number().int().min(0).max(100).optional().nullable(),
  account: z.string().min(1),
  status: z.nativeEnum(TransactionStatus),
  costCenter: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function transactionsRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { take, skip, status, type, dateFrom, dateTo } = parseQuery(ListQuery, request.query);
      const companyId = request.user.role === UserRole.ADMIN ? undefined : request.user.companyId!;
      const where: any = {
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      };
      if (dateFrom || dateTo) {
        where.date = {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        };
      }
      const [items, total] = await Promise.all([
        prisma.transaction.findMany({ where, take, skip, orderBy: { date: "desc" } }),
        prisma.transaction.count({ where }),
      ]);
      return { items, total, take, skip };
    }
  );

  app.get(
    "/:id",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const tx = await prisma.transaction.findUnique({ where: { id: params.id } });
      if (!tx) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && tx.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      return tx;
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const body = parseBody(TxBody, request.body);
      const companyId = request.user.role === UserRole.ADMIN ? (body.companyId ?? request.user.companyId ?? null) : request.user.companyId;
      if (!companyId) throw Object.assign(new Error("COMPANY_REQUIRED"), { statusCode: 400 });
      return prisma.transaction.create({
        data: {
          companyId,
          date: new Date(body.date),
          description: body.description,
          value: body.value,
          type: body.type,
          category: body.category,
          categoryConfidence: body.categoryConfidence ?? null,
          account: body.account,
          status: body.status,
          costCenter: body.costCenter ?? null,
          attachmentUrl: body.attachmentUrl ?? null,
          notes: body.notes ?? null,
        },
      });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const Body = TxBody.omit({ companyId: true }).partial();
      const body = parseBody(Body, request.body);

      const tx = await prisma.transaction.findUnique({ where: { id: params.id } });
      if (!tx) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && tx.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }

      return prisma.transaction.update({
        where: { id: params.id },
        data: {
          date: body.date ? new Date(body.date) : undefined,
          description: body.description,
          value: body.value,
          type: body.type,
          category: body.category,
          categoryConfidence: body.categoryConfidence === undefined ? undefined : body.categoryConfidence,
          account: body.account,
          status: body.status,
          costCenter: body.costCenter === undefined ? undefined : body.costCenter,
          attachmentUrl: body.attachmentUrl === undefined ? undefined : body.attachmentUrl,
          notes: body.notes === undefined ? undefined : body.notes,
        },
      });
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const tx = await prisma.transaction.findUnique({ where: { id: params.id } });
      if (!tx) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && tx.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      await prisma.transaction.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}
