import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { parseBody, parseQuery } from "../../lib/validation.js";
import { requireAuth, requireCompanyScope, requireRole } from "../../lib/auth.js";
import { TitleStatus, UserRole, Prisma } from "@prisma/client";
import { resolveCompanyId } from "../../lib/company.js";

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  status: z.nativeEnum(TitleStatus).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const Body = z.object({
  supplierId: z.string().optional().nullable(),
  supplierExternalId: z.string().optional().nullable(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  paymentDate: z.string().optional().nullable(),
  amount: z.number(),
  openAmount: z.number(),
  paidAmount: z.number().optional().nullable(),
  discountReceived: z.number().optional().nullable(),
  interestReceived: z.number().optional().nullable(),
  status: z.nativeEnum(TitleStatus),
  documentNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
});

export async function apTitlesRoutes(app: FastifyInstance) {
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

      const where: Prisma.ApTitleWhereInput = {
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
        ...(dateFilter ? { dueDate: dateFilter } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.apTitle.findMany({ where, take, skip, orderBy: { dueDate: "asc" } }),
        prisma.apTitle.count({ where }),
      ]);
      return { items, total, take, skip };
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request: FastifyRequest) => {
      const companyId = await resolveCompanyId(request);
      const b = parseBody(Body, request.body);
      let supplierId = b.supplierId ?? null;
      if (!supplierId && b.supplierExternalId) {
        const supplier = await prisma.supplier.findFirst({
          where: { companyId, externalId: b.supplierExternalId },
          select: { id: true },
        });
        supplierId = supplier?.id ?? null;
      }

      const data = {
        companyId,
        supplierId,
        issueDate: new Date(b.issueDate),
        dueDate: new Date(b.dueDate),
        paymentDate: b.paymentDate ? new Date(b.paymentDate) : null,
        amount: b.amount,
        openAmount: b.openAmount,
        paidAmount: b.paidAmount ?? null,
        discountReceived: b.discountReceived ?? null,
        interestReceived: b.interestReceived ?? null,
        status: b.status,
        documentNumber: b.documentNumber ?? null,
        notes: b.notes ?? null,
        externalId: b.externalId ?? null,
      };

      if (b.externalId) {
        const existingByExternal = await prisma.apTitle.findUnique({
          where: { companyId_externalId: { companyId, externalId: b.externalId } },
        });
        if (existingByExternal) {
          const existingIssue = existingByExternal.issueDate.toISOString();
          const existingDue = existingByExternal.dueDate.toISOString();
          const existingPay = existingByExternal.paymentDate ? existingByExternal.paymentDate.toISOString() : null;
          const nextIssue = data.issueDate.toISOString();
          const nextDue = data.dueDate.toISOString();
          const nextPay = data.paymentDate ? data.paymentDate.toISOString() : null;
          if (
            existingByExternal.supplierId === data.supplierId &&
            existingIssue === nextIssue &&
            existingDue === nextDue &&
            existingPay === nextPay &&
            existingByExternal.amount === data.amount &&
            existingByExternal.openAmount === data.openAmount &&
            (existingByExternal.paidAmount ?? null) === (data.paidAmount ?? null) &&
            (existingByExternal.discountReceived ?? null) === (data.discountReceived ?? null) &&
            (existingByExternal.interestReceived ?? null) === (data.interestReceived ?? null) &&
            existingByExternal.status === data.status &&
            (existingByExternal.documentNumber ?? null) === (data.documentNumber ?? null) &&
            (existingByExternal.notes ?? null) === (data.notes ?? null)
          ) {
            return existingByExternal;
          }

          return prisma.apTitle.update({
            where: { id: existingByExternal.id },
            data: { ...data, companyId: undefined, externalId: undefined },
          });
        }

        return prisma.apTitle.create({ data });
      }

      return prisma.apTitle.create({ data });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const b = parseBody(Body.partial(), request.body);
      const existing = await prisma.apTitle.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && existing.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      const nextSupplierId = b.supplierId === undefined ? existing.supplierId : b.supplierId;
      const nextIssueIso = b.issueDate === undefined ? existing.issueDate.toISOString() : new Date(b.issueDate).toISOString();
      const nextDueIso = b.dueDate === undefined ? existing.dueDate.toISOString() : new Date(b.dueDate).toISOString();
      const nextPaymentIso =
        b.paymentDate === undefined
          ? (existing.paymentDate ? existing.paymentDate.toISOString() : null)
          : (b.paymentDate ? new Date(b.paymentDate).toISOString() : null);
      const nextAmount = b.amount === undefined ? existing.amount : b.amount;
      const nextOpenAmount = b.openAmount === undefined ? existing.openAmount : b.openAmount;
      const nextPaidAmount = b.paidAmount === undefined ? (existing.paidAmount ?? null) : (b.paidAmount ?? null);
      const nextDiscount = b.discountReceived === undefined ? (existing.discountReceived ?? null) : (b.discountReceived ?? null);
      const nextInterest = b.interestReceived === undefined ? (existing.interestReceived ?? null) : (b.interestReceived ?? null);
      const nextStatus = b.status === undefined ? existing.status : b.status;
      const nextDoc = b.documentNumber === undefined ? (existing.documentNumber ?? null) : (b.documentNumber ?? null);
      const nextNotes = b.notes === undefined ? (existing.notes ?? null) : (b.notes ?? null);
      if (
        existing.supplierId === nextSupplierId &&
        existing.issueDate.toISOString() === nextIssueIso &&
        existing.dueDate.toISOString() === nextDueIso &&
        (existing.paymentDate ? existing.paymentDate.toISOString() : null) === nextPaymentIso &&
        existing.amount === nextAmount &&
        existing.openAmount === nextOpenAmount &&
        (existing.paidAmount ?? null) === nextPaidAmount &&
        (existing.discountReceived ?? null) === nextDiscount &&
        (existing.interestReceived ?? null) === nextInterest &&
        existing.status === nextStatus &&
        (existing.documentNumber ?? null) === nextDoc &&
        (existing.notes ?? null) === nextNotes
      ) {
        return existing;
      }
      return prisma.apTitle.update({
        where: { id: params.id },
        data: {
          supplierId: b.supplierId === undefined ? undefined : b.supplierId,
          issueDate: b.issueDate ? new Date(b.issueDate) : undefined,
          dueDate: b.dueDate ? new Date(b.dueDate) : undefined,
          paymentDate: b.paymentDate === undefined ? undefined : (b.paymentDate ? new Date(b.paymentDate) : null),
          amount: b.amount === undefined ? undefined : b.amount,
          openAmount: b.openAmount === undefined ? undefined : b.openAmount,
          paidAmount: b.paidAmount === undefined ? undefined : b.paidAmount,
          discountReceived: b.discountReceived === undefined ? undefined : b.discountReceived,
          interestReceived: b.interestReceived === undefined ? undefined : b.interestReceived,
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
      const existing = await prisma.apTitle.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && existing.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      if (existing.status === TitleStatus.PAID) {
        throw Object.assign(new Error("CANNOT_DELETE_PAID_TITLE"), { statusCode: 400 });
      }
      await prisma.apTitle.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}
