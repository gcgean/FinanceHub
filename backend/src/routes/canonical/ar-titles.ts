import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { parseBody, parseQuery } from "../../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../../lib/auth";
import { TitleStatus, UserRole, Prisma } from "@prisma/client";

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  status: z.nativeEnum(TitleStatus).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const Body = z.object({
  customerId: z.string().optional().nullable(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  amount: z.number(),
  openAmount: z.number(),
  status: z.nativeEnum(TitleStatus),
  documentNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
});

export async function arTitlesRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { take, skip, status, from, to } = parseQuery(ListQuery, request.query);
      const companyId = request.user.role === UserRole.ADMIN ? undefined : request.user.companyId!;
      const dateFilter = from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          }
        : undefined;

      const where: Prisma.ArTitleWhereInput = {
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
        ...(dateFilter ? { dueDate: dateFilter } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.arTitle.findMany({ where, take, skip, orderBy: { dueDate: "asc" } }),
        prisma.arTitle.count({ where }),
      ]);
      return { items, total, take, skip };
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = request.user.role === UserRole.ADMIN ? request.user.companyId ?? null : request.user.companyId;
      if (!companyId) throw Object.assign(new Error("COMPANY_REQUIRED"), { statusCode: 400 });
      const b = parseBody(Body, request.body);
      const data = {
        companyId,
        customerId: b.customerId ?? null,
        issueDate: new Date(b.issueDate),
        dueDate: new Date(b.dueDate),
        amount: b.amount,
        openAmount: b.openAmount,
        status: b.status,
        documentNumber: b.documentNumber ?? null,
        notes: b.notes ?? null,
        externalId: b.externalId ?? null,
      };

      if (b.externalId) {
        return prisma.arTitle.upsert({
          where: { companyId_externalId: { companyId, externalId: b.externalId } },
          create: data,
          update: { ...data, companyId: undefined, externalId: undefined },
        });
      }

      return prisma.arTitle.create({ data });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request: FastifyRequest) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const b = parseBody(Body.partial(), request.body);
      const existing = await prisma.arTitle.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && existing.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      return prisma.arTitle.update({
        where: { id: params.id },
        data: {
          customerId: b.customerId === undefined ? undefined : b.customerId,
          issueDate: b.issueDate ? new Date(b.issueDate) : undefined,
          dueDate: b.dueDate ? new Date(b.dueDate) : undefined,
          amount: b.amount === undefined ? undefined : b.amount,
          openAmount: b.openAmount === undefined ? undefined : b.openAmount,
          status: b.status === undefined ? undefined : b.status,
          documentNumber: b.documentNumber === undefined ? undefined : b.documentNumber,
          notes: b.notes === undefined ? undefined : b.notes,
        },
      });
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const existing = await prisma.arTitle.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && existing.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      if (existing.status === TitleStatus.PAID) {
        throw Object.assign(new Error("CANNOT_DELETE_PAID_TITLE"), { statusCode: 400 });
      }
      await prisma.arTitle.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}
