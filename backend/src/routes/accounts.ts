import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { resolveCompanyId } from "../lib/company";
import { UserRole } from "@prisma/client";

const AccountBody = z.object({
  code: z.string().min(1).optional(),
  description: z.string().min(1),
  accountTypeId: z.string().optional().nullable(),
  active: z.boolean().optional(),
  useInCashFlow: z.boolean().optional(),
  superOnly: z.boolean().optional(),
  defaultConfirmed: z.boolean().optional(),
});

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
    async (request) => {
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

      return prisma.account.create({
        data: {
          companyId,
          code,
          description: data.description,
          accountTypeId,
          active: data.active ?? true,
          useInCashFlow: data.useInCashFlow ?? true,
          superOnly: data.superOnly ?? false,
          defaultConfirmed: data.defaultConfirmed ?? false,
        },
      });
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
      return prisma.account.update({ where: { id: params.id }, data });
    }
  );
}
