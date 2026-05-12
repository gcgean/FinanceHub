import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { parseQuery } from "../lib/validation.js";
import { requireAuth, requireCompanyScope } from "../lib/auth.js";
import { resolveCompanyId } from "../lib/company.js";

const SummaryQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const RecentQuery = z.object({
  take: z.coerce.number().int().min(1).max(50).optional().default(5),
  from: z.string().optional(),
  to: z.string().optional(),
});

function parseDateOrUndefined(value: string | undefined) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw Object.assign(new Error("INVALID_DATE"), { statusCode: 400 });
  return d;
}

export async function financeHubRoutes(app: FastifyInstance) {
  app.get(
    "/summary",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const { from, to } = parseQuery(SummaryQuery, request.query);
      const dateFrom = parseDateOrUndefined(from);
      const dateTo = parseDateOrUndefined(to);

      const where = {
        companyId,
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      };

      const grouped = await prisma.transaction.groupBy({
        by: ["type"],
        where,
        _sum: { value: true },
        _count: { _all: true },
      });

      const getSum = (t: TransactionType) => grouped.find((g) => g.type === t)?._sum.value ?? 0;

      const revenueSigned = getSum(TransactionType.REVENUE);
      const expenseSigned = getSum(TransactionType.EXPENSE);

      const revenue = revenueSigned;
      const expense = Math.abs(expenseSigned);
      const net = revenue - expense;

      return {
        from: dateFrom ? dateFrom.toISOString() : null,
        to: dateTo ? dateTo.toISOString() : null,
        revenue,
        expense,
        net,
        counts: {
          revenue: grouped.find((g) => g.type === TransactionType.REVENUE)?._count._all ?? 0,
          expense: grouped.find((g) => g.type === TransactionType.EXPENSE)?._count._all ?? 0,
        },
      };
    }
  );

  app.get(
    "/recent",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const { take, from, to } = parseQuery(RecentQuery, request.query);
      const dateFrom = parseDateOrUndefined(from);
      const dateTo = parseDateOrUndefined(to);

      const items = await prisma.transaction.findMany({
        where: {
          companyId,
          ...(dateFrom || dateTo
            ? {
                date: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo ? { lte: dateTo } : {}),
                },
              }
            : {}),
        },
        orderBy: { date: "desc" },
        take,
      });

      return { items };
    }
  );
}

