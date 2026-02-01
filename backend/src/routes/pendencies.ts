import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody, parseQuery } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { PendencyPriority, PendencyStatus, PendencyType, UserRole } from "@prisma/client";

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  status: z.nativeEnum(PendencyStatus).optional(),
  type: z.nativeEnum(PendencyType).optional(),
});

const CreateBody = z.object({
  transactionId: z.string().min(1),
  type: z.nativeEnum(PendencyType),
  question: z.string().min(1),
  priority: z.nativeEnum(PendencyPriority),
  status: z.nativeEnum(PendencyStatus).optional().default(PendencyStatus.PENDING),
  assignedTo: z.string().min(1),
  dueAt: z.string().min(1),
});

const ResolveBody = z.object({
  response: z.string().min(1),
  resolvedBy: z.string().optional().nullable(),
});

export async function pendenciesRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { take, skip, status, type } = parseQuery(ListQuery, request.query);
      const companyId = request.user.role === UserRole.ADMIN ? undefined : request.user.companyId!;
      const where: any = {
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.pendency.findMany({ where, take, skip, orderBy: { dueAt: "asc" }, include: { transaction: true } }),
        prisma.pendency.count({ where }),
      ]);
      return { items, total, take, skip };
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const body = parseBody(CreateBody, request.body);
      const tx = await prisma.transaction.findUnique({ where: { id: body.transactionId } });
      if (!tx) throw Object.assign(new Error("TRANSACTION_NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && tx.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      const companyId = request.user.role === UserRole.ADMIN ? tx.companyId : request.user.companyId!;
      return prisma.pendency.create({
        data: {
          companyId,
          transactionId: body.transactionId,
          type: body.type,
          question: body.question,
          priority: body.priority,
          status: body.status,
          assignedTo: body.assignedTo,
          dueAt: new Date(body.dueAt),
        },
      });
    }
  );

  app.post(
    "/:id/resolve",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const { response, resolvedBy } = parseBody(ResolveBody, request.body);
      const pendency = await prisma.pendency.findUnique({ where: { id: params.id } });
      if (!pendency) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && pendency.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      return prisma.pendency.update({
        where: { id: params.id },
        data: {
          status: PendencyStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedBy: resolvedBy ?? null,
          response,
        },
      });
    }
  );
}

