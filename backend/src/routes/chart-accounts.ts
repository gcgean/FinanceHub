import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody, parseQuery } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { resolveCompanyId } from "../lib/company";
import { ChartPlanType, CostExpense, DebitCredit, FixedVariable, RevenueExpense, UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";

const ChartAccountBody = z.object({
  code: z.string().min(1).optional(),
  description: z.string().min(1),
  active: z.boolean().optional(),
  isSuper: z.boolean().optional(),
  planType: z.nativeEnum(ChartPlanType),
  parentId: z.string().optional().nullable(),
  revenueExpense: z.nativeEnum(RevenueExpense),
  debitCredit: z.nativeEnum(DebitCredit),
  fixedVariable: z.nativeEnum(FixedVariable),
  costExpense: z.nativeEnum(CostExpense),
  accountingCode: z.string().optional().nullable(),
  dreHide: z.boolean().optional(),
  dreGroupOtherFinIncome: z.boolean().optional(),
  dreGroupDeductionsTaxes: z.boolean().optional(),
  dreGroupInvestments: z.boolean().optional(),
  dreGroupSalesMarketing: z.boolean().optional(),
  dreGroupProfitSharing: z.boolean().optional(),
  cashflowHide: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
});

const ListQuery = z.object({
  active: z.coerce.boolean().optional(),
  planType: z.nativeEnum(ChartPlanType).optional(),
  revenueExpense: z.nativeEnum(RevenueExpense).optional(),
  debitCredit: z.nativeEnum(DebitCredit).optional(),
  parentId: z.string().optional(),
  includeGlobal: z.coerce.boolean().optional().default(true),
});

async function generateNextCode(scopeCompanyId: string | null, parentId?: string | null) {
  if (parentId) {
    const parent = await prisma.chartAccount.findUnique({ where: { id: parentId }, select: { code: true, companyId: true } });
    if (!parent) throw Object.assign(new Error("PARENT_NOT_FOUND"), { statusCode: 400 });
    if ((parent.companyId ?? null) !== (scopeCompanyId ?? null)) throw Object.assign(new Error("PARENT_SCOPE_MISMATCH"), { statusCode: 400 });

    const children = await prisma.chartAccount.findMany({
      where: { parentId, companyId: scopeCompanyId },
      select: { code: true },
    });
    const maxChild = children.reduce((max, row) => {
      const last = String(row.code).split(".").pop() || "";
      if (!/^[0-9]+$/.test(last)) return max;
      const n = Number(last);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    const next = maxChild + 1;
    return `${parent.code}.${String(next).padStart(2, "0")}`;
  }

  const roots = await prisma.chartAccount.findMany({ where: { companyId: scopeCompanyId, parentId: null }, select: { code: true } });
  const numeric = roots
    .map((r) => Number.parseInt(r.code, 10))
    .filter((n) => Number.isFinite(n));
  const next = (numeric.length ? Math.max(...numeric) : 0) + 1;
  return String(next);
}

export async function chartAccountsRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(ListQuery, request.query);

      const companyFilter = q.includeGlobal
        ? { OR: [{ companyId }, { companyId: null }] }
        : { companyId };

      const where: Prisma.ChartAccountWhereInput = {
        ...companyFilter,
        ...(q.active === undefined ? {} : { active: q.active }),
        ...(q.planType ? { planType: q.planType } : {}),
        ...(q.revenueExpense ? { revenueExpense: q.revenueExpense } : {}),
        ...(q.debitCredit ? { debitCredit: q.debitCredit } : {}),
        ...(q.parentId ? { parentId: q.parentId } : {}),
      };

      return prisma.chartAccount.findMany({ where, orderBy: { code: "asc" } });
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const data = parseBody(ChartAccountBody, request.body);

      const wantsGlobal = Boolean(data.isGlobal);
      const scopeCompanyId = request.user.role === UserRole.ADMIN && wantsGlobal ? null : companyId;

      if (data.planType === ChartPlanType.ANALITICA && !data.parentId) {
        throw Object.assign(new Error("ANALITICA_REQUIRES_PARENT"), { statusCode: 400 });
      }

      const autoCode = !data.code;
      const { isGlobal: _isGlobal, ...rest } = data;
      const base: typeof rest = { ...rest };
      base.code = base.code ?? (await generateNextCode(scopeCompanyId, base.parentId ?? null));

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (scopeCompanyId === null) {
            const exists = await prisma.chartAccount.findFirst({ where: { companyId: null, code: base.code } });
            if (exists) throw Object.assign(new Error("CHART_ACCOUNT_CODE_EXISTS"), { statusCode: 409 });
          }
          return await prisma.chartAccount.create({
            data: {
              code: base.code,
              description: base.description,
              planType: base.planType,
              parentId: base.parentId ?? null,
              revenueExpense: base.revenueExpense,
              debitCredit: base.debitCredit,
              fixedVariable: base.fixedVariable,
              costExpense: base.costExpense,
              accountingCode: base.accountingCode ?? null,
              companyId: scopeCompanyId,
              active: base.active ?? true,
              isSuper: base.isSuper ?? false,
              dreHide: base.dreHide ?? false,
              dreGroupOtherFinIncome: base.dreGroupOtherFinIncome ?? false,
              dreGroupDeductionsTaxes: base.dreGroupDeductionsTaxes ?? false,
              dreGroupInvestments: base.dreGroupInvestments ?? false,
              dreGroupSalesMarketing: base.dreGroupSalesMarketing ?? false,
              dreGroupProfitSharing: base.dreGroupProfitSharing ?? false,
              cashflowHide: base.cashflowHide ?? false,
            },
          });
        } catch (e: unknown) {
          const code = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
          const statusCode = typeof e === "object" && e && "statusCode" in e ? (e as { statusCode?: unknown }).statusCode : undefined;
          if (autoCode && (code === "P2002" || statusCode === 409)) {
            base.code = await generateNextCode(scopeCompanyId, base.parentId ?? null);
            continue;
          }
          throw e;
        }
      }

      throw Object.assign(new Error("INTERNAL_SERVER_ERROR"), { statusCode: 500 });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const data = parseBody(ChartAccountBody.partial(), request.body);

      const existing = await prisma.chartAccount.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });

      const isGlobal = existing.companyId === null;
      if (isGlobal && request.user.role !== UserRole.ADMIN) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      if (!isGlobal && existing.companyId !== companyId) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });

      if (data.parentId !== undefined) {
        const parentId = data.parentId;
        if (parentId) {
          const parent = await prisma.chartAccount.findUnique({ where: { id: parentId }, select: { companyId: true } });
          if (!parent) throw Object.assign(new Error("PARENT_NOT_FOUND"), { statusCode: 400 });
          const targetScope = existing.companyId;
          if ((parent.companyId ?? null) !== (targetScope ?? null)) throw Object.assign(new Error("PARENT_SCOPE_MISMATCH"), { statusCode: 400 });
        }
      }

      const wantsGlobal = data.isGlobal;
      const nextCompanyId = wantsGlobal === undefined ? existing.companyId : request.user.role === UserRole.ADMIN && wantsGlobal ? null : companyId;
      const payload: Record<string, unknown> = { ...data };
      delete payload.isGlobal;

      if (wantsGlobal !== undefined && request.user.role !== UserRole.ADMIN) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      if (wantsGlobal !== undefined && nextCompanyId !== existing.companyId) {
        const childCount = await prisma.chartAccount.count({ where: { parentId: existing.id } });
        if (childCount > 0) throw Object.assign(new Error("CANNOT_CHANGE_SCOPE_WITH_CHILDREN"), { statusCode: 400 });
        if (payload.parentId) throw Object.assign(new Error("CANNOT_CHANGE_SCOPE_AND_PARENT"), { statusCode: 400 });
        payload.companyId = nextCompanyId;
      }

      if (payload.companyId === null && payload.code) {
        const exists = await prisma.chartAccount.findFirst({ where: { companyId: null, code: payload.code, id: { not: existing.id } } });
        if (exists) throw Object.assign(new Error("CHART_ACCOUNT_CODE_EXISTS"), { statusCode: 409 });
      }

      return prisma.chartAccount.update({ where: { id: existing.id }, data: payload as Prisma.ChartAccountUpdateInput });
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const existing = await prisma.chartAccount.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      const isGlobal = existing.companyId === null;
      if (isGlobal && request.user.role !== UserRole.ADMIN) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      if (!isGlobal && existing.companyId !== companyId) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });

      const childCount = await prisma.chartAccount.count({ where: { parentId: existing.id } });
      if (childCount > 0) throw Object.assign(new Error("CANNOT_DELETE_WITH_CHILDREN"), { statusCode: 400 });
      await prisma.chartAccount.delete({ where: { id: existing.id } });
      return { ok: true };
    }
  );
}
