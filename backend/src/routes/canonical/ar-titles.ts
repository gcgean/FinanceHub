import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { parseBody, parseQuery } from "../../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../../lib/auth";
import { TitleStatus, UserRole, Prisma } from "@prisma/client";
import { resolveCompanyId } from "../../lib/company";

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  status: z.nativeEnum(TitleStatus).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const Body = z.object({
  customerId: z.string().optional().nullable(),
  customerExternalId: z.string().optional().nullable(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  paymentDate: z.string().optional().nullable(),
  amount: z.number(),
  openAmount: z.number(),
  paidAmount: z.number().optional().nullable(),
  discountReceived: z.number().optional().nullable(),
  interestReceived: z.number().optional().nullable(),
  refundReceived: z.number().optional().nullable(),
  externalSeq: z.string().optional().nullable(),
  saleExternalId: z.string().optional().nullable(),
  sellerExternalId: z.string().optional().nullable(),
  sellerName: z.string().optional().nullable(),
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
      const companyId = await resolveCompanyId(request);
      const b = parseBody(Body, request.body);
      let customerId = b.customerId ?? null;
      if (!customerId && b.customerExternalId) {
        const customer = await prisma.customer.findFirst({
          where: { companyId, externalId: b.customerExternalId },
          select: { id: true },
        });
        customerId = customer?.id ?? null;
      }

      const data = {
        companyId,
        customerId,
        customerExternalId: b.customerExternalId ?? null,
        saleExternalId: b.saleExternalId ?? null,
        issueDate: new Date(b.issueDate),
        dueDate: new Date(b.dueDate),
        paymentDate: b.paymentDate ? new Date(b.paymentDate) : null,
        amount: b.amount,
        openAmount: b.openAmount,
        paidAmount: b.paidAmount ?? null,
        discountReceived: b.discountReceived ?? null,
        interestReceived: b.interestReceived ?? null,
        refundReceived: b.refundReceived ?? null,
        externalSeq: b.externalSeq ?? null,
        sellerExternalId: b.sellerExternalId ?? null,
        sellerName: b.sellerName ?? null,
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
          paymentDate: b.paymentDate === undefined ? undefined : (b.paymentDate ? new Date(b.paymentDate) : null),
          amount: b.amount === undefined ? undefined : b.amount,
          openAmount: b.openAmount === undefined ? undefined : b.openAmount,
          paidAmount: b.paidAmount === undefined ? undefined : b.paidAmount,
          discountReceived: b.discountReceived === undefined ? undefined : b.discountReceived,
          interestReceived: b.interestReceived === undefined ? undefined : b.interestReceived,
          refundReceived: b.refundReceived === undefined ? undefined : b.refundReceived,
          externalSeq: b.externalSeq === undefined ? undefined : b.externalSeq,
          sellerExternalId: b.sellerExternalId === undefined ? undefined : b.sellerExternalId,
          sellerName: b.sellerName === undefined ? undefined : b.sellerName,
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

  // Reconcilia títulos sem customerId usando customerExternalId salvo
  app.post(
    "/reconcile-customers",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);

      // Busca todos os títulos sem cliente mas com customerExternalId
      const orphans = await prisma.arTitle.findMany({
        where: { companyId, customerId: null, customerExternalId: { not: null } },
        select: { id: true, customerExternalId: true },
      });

      if (orphans.length === 0) return { updated: 0 };

      // Busca todos os clientes da empresa de uma vez
      const externalIds = [...new Set(orphans.map((t) => t.customerExternalId as string))];
      const customers = await prisma.customer.findMany({
        where: { companyId, externalId: { in: externalIds } },
        select: { id: true, externalId: true },
      });
      const customerMap = new Map(customers.map((c) => [c.externalId, c.id]));

      // Atualiza em lote usando updateMany por customerId resolvido
      let updated = 0;
      const updates = orphans
        .map((t) => ({ id: t.id, customerId: customerMap.get(t.customerExternalId!) ?? null }))
        .filter((u) => u.customerId !== null);

      await Promise.all(
        updates.map((u) =>
          prisma.arTitle.update({ where: { id: u.id }, data: { customerId: u.customerId } })
        )
      );
      updated = updates.length;

      return { updated, total: orphans.length };
    }
  );
}
