import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody, parseQuery } from "../lib/validation";
import { requireAuth, requireCompanyScope } from "../lib/auth";
import { resolveCompanyId } from "../lib/company";
import { LedgerOperation, RevenueExpense, TitleStatus } from "@prisma/client";
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

const SalesReportQuery = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sellerId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.string().optional(),
});

const AccountsReceivableQuery = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  dateField: z.enum(["issue", "due"]).optional().default("due"),
  status: z.nativeEnum(TitleStatus).optional(),
  customerId: z.string().optional(),
  sellerId: z.string().optional(),
  route: z.string().optional(),
  indicator: z.string().optional(),
  q: z.string().optional(),
});

export async function reportsRoutes(app: FastifyInstance) {
  app.get(
    "/sales",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(SalesReportQuery, request.query);

      const where: Prisma.SaleWhereInput = {
        companyId,
        ...(q.dateFrom || q.dateTo
          ? {
              date: {
                ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
                ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
              },
            }
          : {}),
        ...(q.sellerId ? { sellerId: q.sellerId } : {}),
        ...(q.customerId ? { customerId: q.customerId } : {}),
        ...(q.status 
            ? (q.status === 'FINALIZADA' 
                ? {
                    OR: [
                      { status: null },
                      { status: '' },
                      { status: 'FINALIZADA' },
                      { status: 'OK' }
                    ]
                  }
                : { status: q.status }) 
            : {}),
      };

      const sales = await prisma.sale.findMany({
        where,
        orderBy: { date: "asc" },
        include: {
          customer: { select: { name: true, externalId: true, city: true } },
          seller: { select: { name: true } },
          cashier: { select: { name: true } },
          paymentMethod: { select: { name: true } },
        },
      });

      let totalBruto = 0;
      let totalDevolvido = 0;
      let qty = 0;

      const items = sales.map((sale) => {
        // Here we simulate the logic from Delphi
        // We'll consider CANCELADA_VEN = status 'CANCELADA'
        const isCanceled = sale.status === 'CANCELADA';
        const isDevolvido = sale.status === 'DEVOLVIDA'; // If we have this status
        
        const valorLiquido = sale.total;
        
        if (!isCanceled && !isDevolvido) {
          totalBruto += valorLiquido;
          qty += 1;
        } else if (isDevolvido) {
          totalDevolvido += valorLiquido;
        }

        return {
          id: sale.id,
          externalId: sale.externalId,
          date: sale.date,
          customerName: sale.customer?.name ?? "Consumidor Final",
          customerCity: sale.customer?.city ?? "",
          sellerName: sale.seller?.name ?? "Sem Vendedor",
          cashierName: sale.cashier?.name ?? "",
          paymentMethod: sale.paymentMethod?.name ?? "",
          status: sale.status ?? "FINALIZADA",
          totalBruto: valorLiquido, // Assuming sale.total is the gross before devolution, but for simplicity
          totalDevolvido: isDevolvido ? valorLiquido : 0,
          totalLiquido: isDevolvido || isCanceled ? 0 : valorLiquido,
        };
      });

      const totalLiquido = totalBruto - totalDevolvido;
      const ticketMedio = qty > 0 ? totalLiquido / qty : 0;

      return {
        items,
        totals: {
          qty,
          bruto: totalBruto,
          devolvido: totalDevolvido,
          liquido: totalLiquido,
          ticket_medio: ticketMedio,
        },
      };
    }
  );

  app.get(
    "/accounts-receivable/summary",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(AccountsReceivableQuery, request.query);
      const dateFieldKey = q.dateField === "issue" ? "issueDate" : "dueDate";
      const dateFilter = q.dateFrom || q.dateTo
        ? {
            ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
            ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
          }
        : undefined;

      const where: Prisma.ArTitleWhereInput = {
        companyId,
        ...(q.status ? { status: q.status } : { status: { in: [TitleStatus.OPEN, TitleStatus.OVERDUE] } }),
        ...(dateFilter ? { [dateFieldKey]: dateFilter } : {}),
      };
      const customerFilter: Prisma.CustomerWhereInput = {
        ...(q.customerId ? { id: q.customerId } : {}),
        ...(q.route
          ? {
              OR: [
                { route: { contains: q.route, mode: "insensitive" } },
                { neighborhood: { contains: q.route, mode: "insensitive" } },
                { city: { contains: q.route, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(q.indicator
          ? { classification: { name: { contains: q.indicator, mode: "insensitive" } } }
          : {}),
        ...(q.sellerId ? { sales: { some: { sellerId: q.sellerId } } } : {}),
        ...(q.q
          ? {
              OR: [
                { name: { contains: q.q, mode: "insensitive" } },
                { knownName: { contains: q.q, mode: "insensitive" } },
                { document: { contains: q.q, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      if (Object.keys(customerFilter).length) {
        where.customer = customerFilter;
      }

      const titles = await prisma.arTitle.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              externalId: true,
              name: true,
              knownName: true,
              document: true,
              email: true,
              phone: true,
              city: true,
              state: true,
              route: true,
            },
          },
        },
      });

      // Batch lookup para títulos sem customerId mas com customerExternalId
      const missingExtIds = [
        ...new Set(
          titles
            .filter((t) => !t.customer && t.customerExternalId)
            .map((t) => t.customerExternalId as string)
        ),
      ];
      const extCustomerMap = new Map<string, { id: string; externalId: string | null; name: string; knownName: string | null; document: string | null }>();
      if (missingExtIds.length > 0) {
        const extCustomers = await prisma.customer.findMany({
          where: { companyId, externalId: { in: missingExtIds } },
          select: { id: true, externalId: true, name: true, knownName: true, document: true },
        });
        for (const c of extCustomers) {
          if (c.externalId) extCustomerMap.set(c.externalId, c);
        }
      }

      const now = new Date();
      const byCustomer = new Map<string, {
        customerId: string | null;
        customerExternalId: string | null;
        customerName: string;
        knownName: string | null;
        document: string | null;
        total: number;
        daysSum: number;
        count: number;
      }>();

      for (const t of titles) {
        // Fallback: tenta buscar cliente pelo customerExternalId quando customerId é null
        const resolvedCustomer = t.customer ?? (t.customerExternalId ? extCustomerMap.get(t.customerExternalId) ?? null : null);
        const key = t.customerId ?? resolvedCustomer?.id ?? `ext:${t.customerExternalId ?? "unknown"}`;
        const entry = byCustomer.get(key) ?? {
          customerId: t.customerId ?? resolvedCustomer?.id ?? null,
          customerExternalId: resolvedCustomer?.externalId ?? t.customerExternalId ?? null,
          customerName: resolvedCustomer?.name ?? "Cliente não informado",
          knownName: resolvedCustomer?.knownName ?? null,
          document: resolvedCustomer?.document ?? null,
          total: 0,
          daysSum: 0,
          count: 0,
        };
        const days = Math.floor((now.getTime() - t.dueDate.getTime()) / 86400000);
        // Matching Delphi: sum(VALOR_CTR - DEVOLUCAO_CTR)
        entry.total += t.amount - (t.refundReceived ?? 0);
        entry.daysSum += days;
        entry.count += 1;
        byCustomer.set(key, entry);
      }

      const totalGeral = Array.from(byCustomer.values()).reduce((sum, c) => sum + c.total, 0);
      const items = Array.from(byCustomer.values())
        .map((c) => ({
          customerId: c.customerId,
          customerExternalId: c.customerExternalId,
          customerName: c.customerName,
          knownName: c.knownName,
          document: c.document,
          daysAvg: c.count ? c.daysSum / c.count : 0,
          total: c.total,
          titulos: c.count,
        }))
        .sort((a, b) => b.total - a.total);

      let percAcum = 0;
      const withClass = items.map((c) => {
        const percent = totalGeral ? (c.total / totalGeral) * 100 : 0;
        percAcum += percent;
        const classe = percAcum <= 80 ? "A" : percAcum <= 95 ? "B" : "C";
        return {
          ...c,
          percent,
          percentAccum: percAcum,
          class: classe,
        };
      });

      const totalTitulos = withClass.reduce((sum, c) => sum + c.titulos, 0);
      const daysAvgGeral = withClass.length
        ? withClass.reduce((sum, c) => sum + c.daysAvg, 0) / withClass.length
        : 0;

      return {
        items: withClass,
        totals: {
          totalGeral,
          totalClientes: withClass.length,
          totalTitulos,
          daysAvgGeral,
          dividaMedia: withClass.length ? totalGeral / withClass.length : 0,
        },
      };
    }
  );

  app.get(
    "/accounts-receivable/detail",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(AccountsReceivableQuery, request.query);
      const dateFieldKey = q.dateField === "issue" ? "issueDate" : "dueDate";
      const dateFilter = q.dateFrom || q.dateTo
        ? {
            ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
            ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
          }
        : undefined;

      const where: Prisma.ArTitleWhereInput = {
        companyId,
        ...(q.status ? { status: q.status } : { status: { in: [TitleStatus.OPEN, TitleStatus.OVERDUE] } }),
        ...(dateFilter ? { [dateFieldKey]: dateFilter } : {}),
      };
      const customerFilter: Prisma.CustomerWhereInput = {
        ...(q.customerId ? { id: q.customerId } : {}),
        ...(q.route
          ? {
              OR: [
                { route: { contains: q.route, mode: "insensitive" } },
                { neighborhood: { contains: q.route, mode: "insensitive" } },
                { city: { contains: q.route, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(q.indicator
          ? { classification: { name: { contains: q.indicator, mode: "insensitive" } } }
          : {}),
        ...(q.sellerId ? { sales: { some: { sellerId: q.sellerId } } } : {}),
        ...(q.q
          ? {
              OR: [
                { name: { contains: q.q, mode: "insensitive" } },
                { knownName: { contains: q.q, mode: "insensitive" } },
                { document: { contains: q.q, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      if (Object.keys(customerFilter).length) {
        where.customer = customerFilter;
      }

      const titles = await prisma.arTitle.findMany({
        where,
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        include: {
          customer: {
            select: {
              id: true,
              externalId: true,
              name: true,
              knownName: true,
              document: true,
              email: true,
              phone: true,
              city: true,
              state: true,
              route: true,
            },
          },
        },
      });

      // Batch lookup para títulos sem customerId mas com customerExternalId
      const missingExtIdsDetail = [
        ...new Set(
          titles
            .filter((t) => !t.customer && t.customerExternalId)
            .map((t) => t.customerExternalId as string)
        ),
      ];
      const extCustomerMapDetail = new Map<string, { id: string; externalId: string | null; name: string; knownName: string | null; document: string | null; email: string | null; phone: string | null; city: string | null; state: string | null; route: string | null }>();
      if (missingExtIdsDetail.length > 0) {
        const extCustomers = await prisma.customer.findMany({
          where: { companyId, externalId: { in: missingExtIdsDetail } },
          select: { id: true, externalId: true, name: true, knownName: true, document: true, email: true, phone: true, city: true, state: true, route: true },
        });
        for (const c of extCustomers) {
          if (c.externalId) extCustomerMapDetail.set(c.externalId, c);
        }
      }

      const now = new Date();
      const items = titles.map((t) => {
        const resolvedCustomer = t.customer ?? (t.customerExternalId ? extCustomerMapDetail.get(t.customerExternalId) ?? null : null);
        const days = Math.floor((now.getTime() - t.dueDate.getTime()) / 86400000);
        return {
          id: t.id,
          externalId: t.externalId ?? null,
          externalSeq: t.externalSeq ?? null,
          customerId: t.customerId ?? resolvedCustomer?.id ?? null,
          customerExternalId: resolvedCustomer?.externalId ?? t.customerExternalId ?? null,
          saleExternalId: t.saleExternalId ?? null,
          customerName: resolvedCustomer?.name ?? "Cliente não informado",
          knownName: resolvedCustomer?.knownName ?? null,
          document: resolvedCustomer?.document ?? null,
          email: resolvedCustomer?.email ?? null,
          phone: resolvedCustomer?.phone ?? null,
          city: resolvedCustomer?.city ?? null,
          state: resolvedCustomer?.state ?? null,
          route: resolvedCustomer?.route ?? null,
          issueDate: t.issueDate,
          dueDate: t.dueDate,
          paymentDate: t.paymentDate,
          amount: t.amount,
          devolucao: t.refundReceived ?? 0,
          acrescimo: t.interestReceived ?? 0,
          valorLiquido: t.amount - (t.refundReceived ?? 0) + (t.interestReceived ?? 0),
          openAmount: t.openAmount,
          paidAmount: t.paidAmount ?? 0,
          status: t.status,
          documentNumber: t.documentNumber ?? null,
          daysOverdue: days,
          sellerName: t.sellerName ?? null,
        };
      });

      const totalOpen = items.reduce((sum, i) => sum + i.openAmount, 0);

      return {
        items,
        totals: {
          totalOpen,
          totalTitulos: items.length,
        },
      };
    }
  );

  app.get(
    "/sales-by-payment-method",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(SalesReportQuery, request.query);

      const where: Prisma.SaleWhereInput = {
        companyId,
        ...(q.dateFrom || q.dateTo
          ? {
              date: {
                ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
                ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
              },
            }
          : {}),
        ...(q.sellerId ? { sellerId: q.sellerId } : {}),
        ...(q.customerId ? { customerId: q.customerId } : {}),
        ...(q.status 
            ? (q.status === 'FINALIZADA' 
                ? {
                    OR: [
                      { status: null },
                      { status: '' },
                      { status: 'FINALIZADA' },
                      { status: 'OK' }
                    ]
                  }
                : { status: q.status }) 
            : {}),
      };

      const sales = await prisma.sale.findMany({
        where,
        select: {
          total: true,
          status: true,
          paymentMethod: { select: { id: true, name: true, externalId: true } },
          payments: {
            include: {
              paymentMethod: { select: { id: true, name: true, externalId: true } }
            }
          }
        }
      });

      const grouped: Record<string, { id: string; name: string; qty: number; total: number }> = {};
      let grandTotal = 0;

      for (const sale of sales) {
        if (q.status !== 'CANCELADA' && sale.status === 'CANCELADA') continue;

        if (sale.payments && sale.payments.length > 0) {
          for (const payment of sale.payments) {
            const pmName = payment.paymentMethod?.name || "NÃO INFORMADO";
            if (pmName.toUpperCase() === 'TROCO') continue; // Ignora o Troco

            const pmId = payment.paymentMethod?.id || payment.externalPaymentMethodId || "none";
            
            if (!grouped[pmId]) {
              grouped[pmId] = { id: payment.paymentMethod?.externalId || pmId, name: pmName, qty: 0, total: 0 };
            }
            grouped[pmId].qty += 1;
            grouped[pmId].total += payment.amount;
            grandTotal += payment.amount;
          }
        } else {
          // Fallback para vendas antigas que só tem o paymentMethodId na raiz
          const pmName = sale.paymentMethod?.name || "NÃO INFORMADO";
          if (pmName.toUpperCase() === 'TROCO') continue; // Ignora o Troco

          const pmId = sale.paymentMethod?.id || "none";

          if (!grouped[pmId]) {
            grouped[pmId] = { id: sale.paymentMethod?.externalId || pmId, name: pmName, qty: 0, total: 0 };
          }

          grouped[pmId].qty += 1;
          grouped[pmId].total += sale.total;
          grandTotal += sale.total;
        }
      }

      const items = Object.values(grouped).map(item => ({
        ...item,
        percentage: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0
      })).sort((a, b) => b.total - a.total); // Sort by total descending

      return {
        items,
        grandTotal
      };
    }
  );

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
