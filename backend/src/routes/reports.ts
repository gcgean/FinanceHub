import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody, parseQuery } from "../lib/validation";
import { requireAuth, requireCompanyScope } from "../lib/auth";
import { resolveCompanyId } from "../lib/company";
import { LedgerOperation, RevenueExpense } from "@prisma/client";
import { Prisma } from "@prisma/client";

const StatementQuery = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  accountId: z.string().optional(),
  operation: z.nativeEnum(LedgerOperation).optional(),
  confirmed: z.coerce.boolean().optional(),
});

const DreBody = z.object({
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
});

export async function reportsRoutes(app: FastifyInstance) {
  app.get(
    "/statement",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(StatementQuery, request.query);

      const openingWhere: Prisma.BankLedgerEntryWhereInput = {
        companyId,
        deletedAt: null,
        confirmed: true,
        ...(q.accountId ? { accountId: q.accountId } : {}),
        ...(q.dateFrom ? { issueDate: { lt: new Date(q.dateFrom) } } : {}),
      };
      const openingEntries = await prisma.bankLedgerEntry.findMany({ where: openingWhere, select: { amount: true, operation: true } });
      const openingBalance = openingEntries.reduce((sum, e) => sum + (e.operation === LedgerOperation.CREDITO ? e.amount : -e.amount), 0);

      const where: Prisma.BankLedgerEntryWhereInput = {
        companyId,
        deletedAt: null,
        ...(q.dateFrom || q.dateTo
          ? {
              issueDate: {
                ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
                ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
              },
            }
          : {}),
        ...(q.accountId ? { accountId: q.accountId } : {}),
        ...(q.operation ? { operation: q.operation } : {}),
        ...(q.confirmed === undefined ? {} : { confirmed: q.confirmed }),
      };

      const entries = await prisma.bankLedgerEntry.findMany({
        where,
        orderBy: [{ issueDate: "asc" }, { createdAt: "asc" }],
        include: { account: true },
      });

      let currentBalance = openingBalance;
      let inputs = 0;
      let outputs = 0;
      let toConfirmQty = 0;
      let toConfirmValue = 0;

      const items = entries.map((e) => {
        if (e.confirmed) {
          if (e.operation === LedgerOperation.CREDITO) {
            currentBalance += e.amount;
            inputs += e.amount;
          } else {
            currentBalance -= e.amount;
            outputs += e.amount;
          }
        } else {
          toConfirmQty += 1;
          toConfirmValue += e.amount;
        }
        return {
          ...e,
          accountDescription: e.account?.description ?? null,
          balanceAfter: e.confirmed ? currentBalance : null,
        };
      });

      return {
        items,
        totals: {
          opening_balance: openingBalance,
          inputs,
          outputs,
          closing_balance: currentBalance,
          to_confirm_qty: toConfirmQty,
          to_confirm_value: toConfirmValue,
        },
      };
    }
  );

  app.post(
    "/dre/run",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const { dateFrom, dateTo } = parseBody(DreBody, request.body);

      const splits = await prisma.bankLedgerEntrySplit.findMany({
        where: {
          entry: {
            companyId,
            deletedAt: null,
            confirmed: true,
            issueDate: { gte: new Date(dateFrom), lte: new Date(dateTo) },
          },
        },
        include: { chartAccount: true },
      });

      const byAccount = new Map<string, { id: string; code: string; description: string; revenueExpense: RevenueExpense; parentId: string | null; total: number }>();
      for (const s of splits) {
        const ca = s.chartAccount;
        const key = ca.id;
        const prev = byAccount.get(key);
        if (prev) {
          prev.total += s.splitAmount;
        } else {
          byAccount.set(key, { id: ca.id, code: ca.code, description: ca.description, revenueExpense: ca.revenueExpense, parentId: ca.parentId ?? null, total: s.splitAmount });
        }
      }
      const accounts = Array.from(byAccount.values()).sort((a, b) => a.code.localeCompare(b.code));

      const revenue = accounts.filter((a) => a.revenueExpense === RevenueExpense.RECEITA);
      const expense = accounts.filter((a) => a.revenueExpense === RevenueExpense.DESPESA);

      const totalRevenue = revenue.reduce((sum, a) => sum + a.total, 0);
      const totalExpense = expense.reduce((sum, a) => sum + a.total, 0);
      const operationalResult = totalRevenue - totalExpense;

      const listagem = [
        {
          id: "group_receitas",
          code: "R",
          description: "RECEITAS",
          revenueExpense: RevenueExpense.RECEITA,
          parentId: null,
          total: totalRevenue,
          value: totalRevenue,
          type: "GROUP" as const,
        },
        ...revenue.map((a) => ({
          id: a.id,
          code: a.code,
          description: a.description,
          revenueExpense: a.revenueExpense,
          parentId: a.parentId,
          total: a.total,
          value: a.total,
          type: "ACCOUNT" as const,
        })),
        {
          id: "group_despesas",
          code: "D",
          description: "DESPESAS",
          revenueExpense: RevenueExpense.DESPESA,
          parentId: null,
          total: totalExpense,
          value: totalExpense,
          type: "GROUP" as const,
        },
        ...expense.map((a) => ({
          id: a.id,
          code: a.code,
          description: a.description,
          revenueExpense: a.revenueExpense,
          parentId: a.parentId,
          total: a.total,
          value: a.total,
          type: "ACCOUNT" as const,
        })),
        {
          id: "total_resultado_operacional",
          code: "RES",
          description: "RESULTADO OPERACIONAL",
          revenueExpense: RevenueExpense.RECEITA,
          parentId: null,
          total: operationalResult,
          value: operationalResult,
          type: "TOTAL" as const,
        },
      ];

      return {
        tabs: ["Listagem", "Indicadores", "Índice"],
        listagem,
        indicadores: {
          receita_bruta: totalRevenue,
          lucro_liquido: operationalResult,
          margem: totalRevenue ? (operationalResult / totalRevenue) * 100 : 0,
        },
        indice_composicao: [],
      };
    }
  );
}
