import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { resolveCompanyId } from "../lib/company";
import { UserRole } from "@prisma/client";

const AccountBody = z.object({
  code: z.string().min(1).optional(),
  description: z.string().min(1),
  externalCode: z.string().optional().nullable(),
  accountTypeId: z.string().optional().nullable(),
  active: z.boolean().optional(),
  useInCashFlow: z.boolean().optional(),
  superOnly: z.boolean().optional(),
  defaultConfirmed: z.boolean().optional(),
});

async function getAccountWithExtras(params: { companyId: string; accountId: string }) {
  const account = await prisma.account.findUnique({
    where: { id: params.accountId },
    include: { accountType: true },
  });
  if (!account) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
  if (account.companyId !== params.companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });

  const ledger = await prisma.bankLedgerEntry.findMany({
    where: { companyId: params.companyId, deletedAt: null, confirmed: true, accountId: params.accountId },
    select: { amount: true, operation: true },
  });
  const balance = ledger.reduce<number>((sum, e) => sum + (e.operation === "CREDITO" ? e.amount : -e.amount), 0);

  return {
    ...account,
    typeDescription: account.accountType?.description ?? null,
    balance,
  };
}

export async function accountsRoutes(app: FastifyInstance) {
  app.get(
    "/types",
    { preHandler: [requireAuth(app)] },
    async () => {
      return prisma.accountType.findMany({ orderBy: { code: "asc" } });
    }
  );

  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const accounts = await prisma.account.findMany({
        where: { companyId },
        orderBy: { code: "asc" },
        include: { accountType: true },
      });

      const ledger = await prisma.bankLedgerEntry.findMany({
        where: { companyId, deletedAt: null, confirmed: true, accountId: { not: null } },
        select: { accountId: true, amount: true, operation: true },
      });

      const byAccount: Record<string, number> = {};
      for (const e of ledger) {
        if (!e.accountId) continue;
        const signed = e.operation === "CREDITO" ? e.amount : -e.amount;
        byAccount[e.accountId] = (byAccount[e.accountId] ?? 0) + signed;
      }

      return accounts.map((a) => ({
        ...a,
        typeDescription: a.accountType?.description ?? null,
        balance: byAccount[a.id] ?? 0,
      }));
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request: FastifyRequest) => {
      const companyId = await resolveCompanyId(request);
      const data = parseBody(AccountBody, request.body);

      const code = data.code
        ? data.code
        : await (async () => {
            const existing = await prisma.account.findMany({ where: { companyId }, select: { code: true } });
            const numeric = existing
              .map((x) => Number.parseInt(x.code, 10))
              .filter((n) => Number.isFinite(n));
            const next = (numeric.length ? Math.max(...numeric) : 0) + 1;
            return String(next).padStart(2, "0");
          })();

      const defaultType = await prisma.accountType.findFirst({ where: { code: "003" } });
      const accountTypeId = data.accountTypeId ?? defaultType?.id ?? null;

      let created;
      try {
        created = await prisma.account.create({
          data: {
            companyId,
            code,
            description: data.description,
            externalCode: data.externalCode ?? null,
            accountTypeId,
            active: data.active ?? true,
            useInCashFlow: data.useInCashFlow ?? true,
            superOnly: data.superOnly ?? false,
            defaultConfirmed: data.defaultConfirmed ?? false,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("ACCOUNT_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }

      return getAccountWithExtras({ companyId, accountId: created.id });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const data = parseBody(AccountBody.partial(), request.body);
      const existing = await prisma.account.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });

      let updated;
      try {
        updated = await prisma.account.update({ where: { id: params.id }, data });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("ACCOUNT_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }
      return getAccountWithExtras({ companyId, accountId: updated.id });
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const existing = await prisma.account.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      const inUse = await prisma.bankLedgerEntry.count({ where: { companyId, accountId: params.id } });
      if (inUse > 0) throw Object.assign(new Error("CANNOT_DELETE_IN_USE"), { statusCode: 400 });
      await prisma.account.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}
