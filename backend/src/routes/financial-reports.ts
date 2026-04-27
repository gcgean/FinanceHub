import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { parseQuery } from "../lib/validation.js";
import { requireAuth, requireCompanyScope } from "../lib/auth.js";
import { resolveCompanyId } from "../lib/company.js";
import { TitleStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Retorna "YYYY-MM" de uma Date */
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Dias entre duas datas (positivo = d1 é mais recente) */
function diffDays(d1: Date, d2: Date): number {
  return Math.floor((d1.getTime() - d2.getTime()) / 86_400_000);
}

/** Classifica bucket de aging baseado em dias de atraso */
function agingBucket(days: number): "future" | "d1_30" | "d31_60" | "d61_90" | "d91plus" {
  if (days < 0) return "future";
  if (days <= 30) return "d1_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d91plus";
}

// ─── Schemas Zod ────────────────────────────────────────────────────────────

const DateRangeQuery = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const AgingQuery = DateRangeQuery.extend({
  customerId: z.string().optional(),
  q: z.string().optional(),
});

const DelinquencyQuery = DateRangeQuery.extend({
  q: z.string().optional(),
  top: z.coerce.number().optional().default(100),
});

const RiskQuery = z.object({
  top: z.coerce.number().optional().default(50),
});

const ForecastQuery = DateRangeQuery.extend({
  historicalMonths: z.coerce.number().optional().default(12),
});

// ─── Shared: batch lookup de customer por externalId ────────────────────────

type ExtCustomer = { id: string; name: string; knownName: string | null; document: string | null; externalId: string | null };
type TitleForResolve = { customerId: string | null; customerExternalId: string | null; customer: ExtCustomer | null };

async function resolveCustomers(
  companyId: string,
  titles: TitleForResolve[]
): Promise<Map<string, ExtCustomer>> {
  const missingExtIds = [
    ...new Set(
      titles
        .filter((t) => !t.customer && t.customerExternalId)
        .map((t) => t.customerExternalId as string)
    ),
  ];
  const map = new Map<string, ExtCustomer>();
  if (missingExtIds.length > 0) {
    const ext = await prisma.customer.findMany({
      where: { companyId, externalId: { in: missingExtIds } },
      select: { id: true, externalId: true, name: true, knownName: true, document: true },
    });
    for (const c of ext) {
      if (c.externalId) map.set(c.externalId, c);
    }
  }
  return map;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export async function financialReportsRoutes(app: FastifyInstance) {

  // ══════════════════════════════════════════════════════════════════════════
  // 1. AGING — Contas a Receber por Faixa de Vencimento
  //    Fórmula: dias = hoje - dueDate
  //    Buckets: future (dias < 0), d1_30, d31_60, d61_90, d91plus
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/aging",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(AgingQuery, request.query);

      const where: Prisma.ArTitleWhereInput = {
        companyId,
        status: { in: [TitleStatus.OPEN, TitleStatus.OVERDUE] },
        ...(q.customerId ? { customerId: q.customerId } : {}),
        ...(q.q
          ? { customer: { OR: [{ name: { contains: q.q, mode: "insensitive" } }, { knownName: { contains: q.q, mode: "insensitive" } }] } }
          : {}),
      };

      const titles = await prisma.arTitle.findMany({
        where,
        include: {
          customer: { select: { id: true, externalId: true, name: true, knownName: true, document: true } },
        },
        orderBy: { dueDate: "asc" },
      });

      const extMap = await resolveCustomers(companyId, titles);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const buckets = {
        future: { label: "A Vencer", count: 0, amount: 0 },
        d1_30:  { label: "1-30 dias", count: 0, amount: 0 },
        d31_60: { label: "31-60 dias", count: 0, amount: 0 },
        d61_90: { label: "61-90 dias", count: 0, amount: 0 },
        d91plus: { label: "Acima de 90 dias", count: 0, amount: 0 },
      };

      const items = titles.map((t) => {
        const cust = t.customer ?? (t.customerExternalId ? extMap.get(t.customerExternalId) ?? null : null);
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        const days = diffDays(now, due);
        const bucket = agingBucket(days);
        buckets[bucket].count++;
        buckets[bucket].amount += t.openAmount;
        return {
          id: t.id,
          customerId: t.customerId ?? cust?.id ?? null,
          customerExternalId: cust?.externalId ?? t.customerExternalId ?? null,
          customerName: cust?.name ?? "Cliente não informado",
          knownName: cust?.knownName ?? null,
          document: cust?.document ?? null,
          documentNumber: t.documentNumber ?? null,
          externalId: t.externalId ?? null,
          externalSeq: t.externalSeq ?? null,
          issueDate: t.issueDate,
          dueDate: t.dueDate,
          amount: t.amount,
          openAmount: t.openAmount,
          daysOverdue: days,
          bucket,
          sellerName: t.sellerName ?? null,
        };
      });

      const totalAmount = items.reduce((s, i) => s + i.openAmount, 0);

      return {
        buckets,
        items,
        totals: { count: items.length, amount: totalAmount },
      };
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 2. INADIMPLÊNCIA POR CLIENTE
  //    Títulos com status OVERDUE ou (OPEN com dueDate < hoje)
  //    Métricas: totalAberto, qtdVencidos, atrasoMedio, maiorAtraso, ultimoPagamento
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/delinquency-by-customer",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(DelinquencyQuery, request.query);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const where: Prisma.ArTitleWhereInput = {
        companyId,
        OR: [
          { status: TitleStatus.OVERDUE },
          { status: TitleStatus.OPEN, dueDate: { lt: now } },
        ],
        ...(q.q ? { customer: { OR: [{ name: { contains: q.q, mode: "insensitive" } }, { knownName: { contains: q.q, mode: "insensitive" } }] } } : {}),
      };

      const titles = await prisma.arTitle.findMany({
        where,
        include: {
          customer: { select: { id: true, externalId: true, name: true, knownName: true, document: true } },
        },
      });

      const extMap = await resolveCustomers(companyId, titles);

      // Agrupar por cliente
      const byCustomer = new Map<string, {
        customerId: string | null;
        customerName: string;
        knownName: string | null;
        document: string | null;
        customerExternalId: string | null;
        totalOpen: number;
        overdueCount: number;
        daysSum: number;
        maxDays: number;
      }>();

      for (const t of titles) {
        const cust = t.customer ?? (t.customerExternalId ? extMap.get(t.customerExternalId) ?? null : null);
        const key = t.customerId ?? cust?.id ?? `ext:${t.customerExternalId ?? "unknown"}`;
        const days = diffDays(now, new Date(t.dueDate));
        const entry = byCustomer.get(key) ?? {
          customerId: t.customerId ?? cust?.id ?? null,
          customerName: cust?.name ?? "Cliente não informado",
          knownName: cust?.knownName ?? null,
          document: cust?.document ?? null,
          customerExternalId: cust?.externalId ?? t.customerExternalId ?? null,
          totalOpen: 0,
          overdueCount: 0,
          daysSum: 0,
          maxDays: 0,
        };
        entry.totalOpen += t.openAmount;
        entry.overdueCount++;
        entry.daysSum += Math.max(0, days);
        entry.maxDays = Math.max(entry.maxDays, Math.max(0, days));
        byCustomer.set(key, entry);
      }

      // Buscar último pagamento por cliente (query separada para eficiência)
      const customerIds = [...byCustomer.values()]
        .filter((c) => c.customerId)
        .map((c) => c.customerId as string);

      const lastPayments: Map<string, Date> = new Map();
      if (customerIds.length > 0) {
        const paid = await prisma.arTitle.findMany({
          where: { companyId, customerId: { in: customerIds }, paymentDate: { not: null } },
          select: { customerId: true, paymentDate: true },
          orderBy: { paymentDate: "desc" },
        });
        for (const p of paid) {
          if (p.customerId && !lastPayments.has(p.customerId)) {
            lastPayments.set(p.customerId, p.paymentDate!);
          }
        }
      }

      const items = Array.from(byCustomer.values())
        .map((c) => ({
          customerId: c.customerId,
          customerExternalId: c.customerExternalId,
          customerName: c.customerName,
          knownName: c.knownName,
          document: c.document,
          totalOpen: c.totalOpen,
          overdueCount: c.overdueCount,
          avgDelayDays: c.overdueCount > 0 ? Math.round(c.daysSum / c.overdueCount) : 0,
          maxDelayDays: c.maxDays,
          lastPaymentDate: c.customerId ? (lastPayments.get(c.customerId) ?? null) : null,
        }))
        .sort((a, b) => b.totalOpen - a.totalOpen)
        .slice(0, q.top);

      const totalCustomers = items.length;
      const totalOpen = items.reduce((s, i) => s + i.totalOpen, 0);
      const avgDelay = totalCustomers > 0
        ? Math.round(items.reduce((s, i) => s + i.avgDelayDays, 0) / totalCustomers)
        : 0;

      return {
        items,
        totals: { totalOpen, totalCustomers, avgDelayDays: avgDelay },
      };
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 3. DSO — Days Sales Outstanding / Prazo Médio de Recebimento
  //    Fórmula: para cada mês de pagamento, avg(paymentDate - issueDate) em dias
  //    Agrupamento: por YYYY-MM de paymentDate
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/dso",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(DateRangeQuery, request.query);

      const where: Prisma.ArTitleWhereInput = {
        companyId,
        status: TitleStatus.PAID,
        paymentDate: { not: null },
        ...(q.dateFrom || q.dateTo
          ? {
              paymentDate: {
                ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
                ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
              },
            }
          : {}),
      };

      const titles = await prisma.arTitle.findMany({
        where,
        select: { issueDate: true, paymentDate: true, paidAmount: true, amount: true },
      });

      // Agrupar por mês de paymentDate
      const byMonth = new Map<string, { daysSum: number; count: number; totalPaid: number }>();

      for (const t of titles) {
        if (!t.paymentDate) continue;
        const key = monthKey(t.paymentDate);
        const days = Math.max(0, diffDays(t.paymentDate, t.issueDate));
        const entry = byMonth.get(key) ?? { daysSum: 0, count: 0, totalPaid: 0 };
        entry.daysSum += days;
        entry.count++;
        entry.totalPaid += t.paidAmount ?? t.amount;
        byMonth.set(key, entry);
      }

      const months = Array.from(byMonth.entries())
        .map(([month, d]) => ({
          month,
          dso: d.count > 0 ? Math.round(d.daysSum / d.count) : 0,
          count: d.count,
          totalPaid: d.totalPaid,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const totalCount = months.reduce((s, m) => s + m.count, 0);
      const avgDso = totalCount > 0
        ? Math.round(months.reduce((s, m) => s + m.dso * m.count, 0) / totalCount)
        : 0;

      return { months, overall: { avgDso, totalCount } };
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 4. FATURADO x RECEBIDO
  //    Faturado: sum(amount) agrupado por YYYY-MM de issueDate (exceto CANCELED)
  //    Recebido: sum(paidAmount) agrupado por YYYY-MM de paymentDate (apenas PAID)
  //    Ticker de eficiência: received / billed
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/billed-vs-received",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(DateRangeQuery, request.query);

      const [billedTitles, receivedTitles] = await Promise.all([
        // Faturado: tudo emitido no período (exceto cancelado)
        prisma.arTitle.findMany({
          where: {
            companyId,
            status: { not: TitleStatus.CANCELED },
            ...(q.dateFrom || q.dateTo
              ? { issueDate: { ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}), ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}) } }
              : {}),
          },
          select: { issueDate: true, amount: true },
        }),
        // Recebido: pago no período
        prisma.arTitle.findMany({
          where: {
            companyId,
            status: TitleStatus.PAID,
            paymentDate: { not: null },
            ...(q.dateFrom || q.dateTo
              ? { paymentDate: { ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}), ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}) } }
              : {}),
          },
          select: { paymentDate: true, paidAmount: true, amount: true },
        }),
      ]);

      const billedByMonth = new Map<string, number>();
      for (const t of billedTitles) {
        const key = monthKey(t.issueDate);
        billedByMonth.set(key, (billedByMonth.get(key) ?? 0) + t.amount);
      }

      const receivedByMonth = new Map<string, number>();
      for (const t of receivedTitles) {
        const key = monthKey(t.paymentDate!);
        receivedByMonth.set(key, (receivedByMonth.get(key) ?? 0) + (t.paidAmount ?? t.amount));
      }

      // União dos meses
      const allMonths = new Set([...billedByMonth.keys(), ...receivedByMonth.keys()]);
      const months = Array.from(allMonths)
        .sort()
        .map((month) => {
          const billed = billedByMonth.get(month) ?? 0;
          const received = receivedByMonth.get(month) ?? 0;
          return { month, billed, received, gap: billed - received };
        });

      const totalBilled = months.reduce((s, m) => s + m.billed, 0);
      const totalReceived = months.reduce((s, m) => s + m.received, 0);

      return {
        months,
        totals: {
          billed: totalBilled,
          received: totalReceived,
          gap: totalBilled - totalReceived,
        },
      };
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 5. PREVISÃO DE RECEBIMENTO
  //    Base: títulos futuros OPEN/OVERDUE com dueDate > hoje
  //    Ajuste: × (1 - taxa_inadimplência_histórica)
  //    Taxa inadimplência histórica: % dos títulos emitidos nos últimos N meses
  //      que NÃO foram pagos (status ≠ PAID) ou foram pagos com atraso
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/receivable-forecast",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(ForecastQuery, request.query);

      const now = new Date();
      const historicalStart = new Date(now);
      historicalStart.setMonth(historicalStart.getMonth() - q.historicalMonths);

      // Taxa histórica de inadimplência: títulos emitidos no passado vs títulos pagos
      const [historicalTotal, historicalPaid] = await Promise.all([
        prisma.arTitle.aggregate({
          where: { companyId, status: { not: TitleStatus.CANCELED }, issueDate: { gte: historicalStart, lt: now } },
          _count: { id: true },
        }),
        prisma.arTitle.aggregate({
          where: { companyId, status: TitleStatus.PAID, issueDate: { gte: historicalStart, lt: now } },
          _count: { id: true },
        }),
      ]);

      const totalHist = historicalTotal._count.id;
      const paidHist = historicalPaid._count.id;
      // Fórmula: taxa_inadimplência = 1 - (pagos / total_emitido)
      const delinquencyRate = totalHist > 0 ? 1 - paidHist / totalHist : 0.15;

      // Títulos futuros ainda em aberto
      const futureTitles = await prisma.arTitle.findMany({
        where: {
          companyId,
          status: { in: [TitleStatus.OPEN, TitleStatus.OVERDUE] },
          dueDate: { gte: now },
        },
        select: { dueDate: true, openAmount: true },
      });

      const byMonth = new Map<string, { rawAmount: number; count: number }>();
      for (const t of futureTitles) {
        const key = monthKey(t.dueDate);
        const entry = byMonth.get(key) ?? { rawAmount: 0, count: 0 };
        entry.rawAmount += t.openAmount;
        entry.count++;
        byMonth.set(key, entry);
      }

      const months = Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, d]) => ({
          month,
          rawAmount: d.rawAmount,
          // Receita esperada após ajuste de inadimplência
          adjustedAmount: d.rawAmount * (1 - delinquencyRate),
          count: d.count,
        }));

      const totalRaw = months.reduce((s, m) => s + m.rawAmount, 0);
      const totalAdj = months.reduce((s, m) => s + m.adjustedAmount, 0);

      return {
        delinquencyRate,
        months,
        totals: { rawAmount: totalRaw, adjustedAmount: totalAdj },
      };
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 6. CLIENTES EM RISCO — Score Composto (0–1, quanto maior pior)
  //    sc1 (30%): qtd_vencidos normalizado pela base
  //    sc2 (30%): dias_max_atraso normalizado pela base
  //    sc3 (20%): dias_desde_ultimo_pagamento normalizado
  //    sc4 (20%): taxa_inadimplencia do cliente (vencidos / total títulos)
  //    Níveis: HIGH >= 0.65, MEDIUM >= 0.35, LOW < 0.35
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/at-risk-customers",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(RiskQuery, request.query);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Buscar todos os títulos de clientes ativos (OPEN, OVERDUE e PAID para histórico)
      const titles = await prisma.arTitle.findMany({
        where: {
          companyId,
          status: { in: [TitleStatus.OPEN, TitleStatus.OVERDUE, TitleStatus.PAID] },
          customerId: { not: null },
        },
        include: {
          customer: { select: { id: true, name: true, knownName: true, document: true, isActive: true } },
        },
      });

      const typedTitles = titles;

      // Agrupar por cliente
      const byCustomer = new Map<string, {
        customerId: string;
        customerName: string;
        knownName: string | null;
        document: string | null;
        overdueCount: number;
        totalCount: number;
        daysMaxOverdue: number;
        lastPaymentDate: Date | null;
        totalOpen: number;
      }>();

      for (const t of typedTitles) {
        if (!t.customerId || !t.customer) continue;
        const key = t.customerId;
        const days = diffDays(now, new Date(t.dueDate));
        const isOverdue = t.status === TitleStatus.OVERDUE || (t.status === TitleStatus.OPEN && days > 0);

        const entry = byCustomer.get(key) ?? {
          customerId: t.customerId,
          customerName: t.customer.name,
          knownName: t.customer.knownName ?? null,
          document: t.customer.document ?? null,
          overdueCount: 0,
          totalCount: 0,
          daysMaxOverdue: 0,
          lastPaymentDate: null,
          totalOpen: 0,
        };

        entry.totalCount++;
        if (isOverdue) {
          entry.overdueCount++;
          entry.daysMaxOverdue = Math.max(entry.daysMaxOverdue, Math.max(0, days));
          entry.totalOpen += t.openAmount;
        }
        if (t.paymentDate) {
          if (!entry.lastPaymentDate || t.paymentDate > entry.lastPaymentDate) {
            entry.lastPaymentDate = t.paymentDate;
          }
        }
        byCustomer.set(key, entry);
      }

      // Filtrar apenas clientes COM títulos vencidos
      const withRisk = Array.from(byCustomer.values()).filter((c) => c.overdueCount > 0);
      if (withRisk.length === 0) return { items: [] };

      // Normalização para o score
      const maxOverdueCount = Math.max(...withRisk.map((c) => c.overdueCount));
      const maxDaysOverdue = Math.max(...withRisk.map((c) => c.daysMaxOverdue));
      const maxDaysSincePay = Math.max(
        ...withRisk.map((c) =>
          c.lastPaymentDate ? diffDays(now, c.lastPaymentDate) : 730
        )
      );

      const items = withRisk
        .map((c) => {
          const sc1 = maxOverdueCount > 0 ? c.overdueCount / maxOverdueCount : 0;
          const sc2 = maxDaysOverdue > 0 ? c.daysMaxOverdue / maxDaysOverdue : 0;
          const daysSincePayment = c.lastPaymentDate ? diffDays(now, c.lastPaymentDate) : 730;
          const sc3 = maxDaysSincePay > 0 ? Math.min(daysSincePayment, 730) / maxDaysSincePay : 1;
          const sc4 = c.totalCount > 0 ? c.overdueCount / c.totalCount : 0;
          const score = 0.3 * sc1 + 0.3 * sc2 + 0.2 * sc3 + 0.2 * sc4;
          const riskLevel: "HIGH" | "MEDIUM" | "LOW" = score >= 0.65 ? "HIGH" : score >= 0.35 ? "MEDIUM" : "LOW";
          return {
            customerId: c.customerId,
            customerName: c.customerName,
            knownName: c.knownName,
            document: c.document,
            overdueCount: c.overdueCount,
            maxDelayDays: c.daysMaxOverdue,
            daysSinceLastPayment: c.lastPaymentDate ? daysSincePayment : null,
            defaultRate: c.totalCount > 0 ? c.overdueCount / c.totalCount : 0,
            totalOpen: c.totalOpen,
            score: Math.round(score * 100) / 100,
            riskLevel,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, q.top);

      return { items };
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 7. CHURN — Baseado em CustomerDeactivation
  //    Agrupado por mês de deactivatedAt
  //    Taxa: deactivated_month / (ativos_no_inicio_mes + deactivated_month)
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/churn",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(DateRangeQuery, request.query);

      const where: Prisma.CustomerDeactivationWhereInput = {
        companyId,
        ...(q.dateFrom || q.dateTo
          ? {
              deactivatedAt: {
                ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
                ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
              },
            }
          : {}),
      };

      const deactivations = await prisma.customerDeactivation.findMany({
        where,
        include: {
          customer: { select: { name: true, externalId: true } },
          reasonRef: { select: { description: true } },
        },
        orderBy: { deactivatedAt: "asc" },
      });

      // Total de clientes ativos HOJE (para taxa aproximada)
      const totalActiveNow = await prisma.customer.count({
        where: { companyId, isActive: true },
      });

      // Agrupar por mês
      const byMonth = new Map<string, {
        churned: number;
        churnedValue: number;
        reasons: Map<string, number>;
        customers: { name: string; value: number | null; reason: string | null }[];
      }>();

      for (const d of deactivations) {
        const key = monthKey(d.deactivatedAt);
        const entry = byMonth.get(key) ?? {
          churned: 0,
          churnedValue: 0,
          reasons: new Map<string, number>(),
          customers: [],
        };
        entry.churned++;
        entry.churnedValue += d.value ?? 0;
        const reason = d.reasonRef?.description ?? d.reason ?? "Não informado";
        entry.reasons.set(reason, (entry.reasons.get(reason) ?? 0) + 1);
        entry.customers.push({ name: d.customer?.name ?? "—", value: d.value ?? null, reason });
        byMonth.set(key, entry);
      }

      const months = Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, d]) => ({
          month,
          churned: d.churned,
          churnedValue: d.churnedValue,
          // Taxa aproximada: churned / (active_now + total_churned_since_beginning)
          // Usamos a base ativa atual + churned do mês como denominador aproximado
          totalActiveAtMonth: totalActiveNow + deactivations.length,
          churnRate: (totalActiveNow + deactivations.length) > 0
            ? d.churned / (totalActiveNow + deactivations.length)
            : 0,
          reasons: Array.from(d.reasons.entries()).map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count),
          customers: d.customers,
        }));

      const totalChurned = deactivations.length;
      const avgChurnRate = months.length > 0
        ? months.reduce((s, m) => s + m.churnRate, 0) / months.length
        : 0;

      return {
        months,
        totals: {
          totalChurned,
          avgChurnRate,
          totalChurnedValue: deactivations.reduce((s, d) => s + (d.value ?? 0), 0),
          activeCustomers: totalActiveNow,
        },
      };
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 8. COHORT DE RETENÇÃO
  //    Cohort: mês de Customer.createdAt
  //    Atividade: presença de ArTitle PAID em cada mês subsequente
  //    Retenção: activeCount / cohortSize por mês offset
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/cohort",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(DateRangeQuery, request.query);

      // Clientes criados no range (cohort de entrada)
      const customers = await prisma.customer.findMany({
        where: {
          companyId,
          ...(q.dateFrom || q.dateTo
            ? {
                createdAt: {
                  ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
                  ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
                },
              }
            : {}),
        },
        select: { id: true, createdAt: true },
      });

      if (customers.length === 0) return { cohorts: [] };

      const customerIds = customers.map((c) => c.id);

      // Atividade: todos os ArTitle PAID desses clientes
      const paidTitles = await prisma.arTitle.findMany({
        where: {
          companyId,
          customerId: { in: customerIds },
          status: TitleStatus.PAID,
          paymentDate: { not: null },
        },
        select: { customerId: true, paymentDate: true },
      });

      // Montar set de (customerId, YYYY-MM) de pagamento
      const activitySet = new Set<string>();
      for (const t of paidTitles) {
        if (t.customerId && t.paymentDate) {
          activitySet.add(`${t.customerId}|${monthKey(t.paymentDate)}`);
        }
      }

      // Agrupar clientes por cohort month
      const cohortMap = new Map<string, string[]>(); // cohortMonth → customerIds
      for (const c of customers) {
        const key = monthKey(c.createdAt);
        const list = cohortMap.get(key) ?? [];
        list.push(c.id);
        cohortMap.set(key, list);
      }

      // Para cada cohort, calcular retenção por offset
      const now = new Date();
      const cohorts = Array.from(cohortMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cohortMonth, ids]) => {
          const size = ids.length;
          const [cy, cm] = cohortMonth.split("-").map(Number);
          const periods: { periodOffset: number; periodMonth: string; activeCount: number; retentionRate: number }[] = [];

          // Calcular para cada offset de mês até hoje
          const cohortDate = new Date(cy, cm - 1, 1);
          const maxMonths = diffDays(now, cohortDate) / 30;

          for (let offset = 0; offset <= Math.min(Math.floor(maxMonths), 23); offset++) {
            const pd = new Date(cy, cm - 1 + offset, 1);
            const pMonth = monthKey(pd);
            const activeCount = ids.filter((id) => activitySet.has(`${id}|${pMonth}`)).length;
            periods.push({
              periodOffset: offset,
              periodMonth: pMonth,
              activeCount,
              retentionRate: size > 0 ? activeCount / size : 0,
            });
          }

          return { cohortMonth, size, periods };
        });

      return { cohorts };
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 9. MUDANÇA DE COMPORTAMENTO DE PAGAMENTO
  //    Detecta clientes que historicamente pagavam em dia mas nos últimos
  //    N meses passaram a atrasar.
  //
  //    Critérios de inclusão:
  //      - Mín. 3 títulos PAGOS antes do período recente (base histórica)
  //      - Taxa de pontualidade histórica >= 70%
  //      - Taxa de atraso no período recente >= 30%
  //
  //    Período "recente": últimos recentMonths meses (padrão: 3)
  //    Período "histórico": tudo que ficou fora do período recente
  //
  //    Severidade:
  //      MILD     → atraso recente 30–49%
  //      MODERATE → atraso recente 50–69%
  //      SEVERE   → atraso recente >= 70%
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/payment-behavior-change",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(
        z.object({ recentMonths: z.coerce.number().optional().default(3) }),
        request.query
      );

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Cutoff: início do período recente
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - q.recentMonths);

      // Buscar todos os títulos ativos (PAID para histórico + OPEN/OVERDUE para recente)
      const titles = await prisma.arTitle.findMany({
        where: {
          companyId,
          status: { in: [TitleStatus.PAID, TitleStatus.OPEN, TitleStatus.OVERDUE] },
          customerId: { not: null },
        },
        include: {
          customer: {
            select: { id: true, name: true, knownName: true, document: true },
          },
        },
      });

      // ── Estrutura por cliente ──────────────────────────────────────────────
      type HistEntry = { daysLate: number };
      type RecentEntry = { isLate: boolean; daysLate: number; openAmount: number };

      const byCustomer = new Map<
        string,
        {
          customerId: string;
          customerName: string;
          knownName: string | null;
          document: string | null;
          historical: HistEntry[];
          recent: RecentEntry[];
          totalOpen: number;
        }
      >();

      for (const t of titles) {
        if (!t.customerId || !t.customer) continue;

        const key = t.customerId;
        const entry = byCustomer.get(key) ?? {
          customerId: t.customerId,
          customerName: t.customer.name,
          knownName: t.customer.knownName ?? null,
          document: t.customer.document ?? null,
          historical: [],
          recent: [],
          totalOpen: 0,
        };

        const dueDate = new Date(t.dueDate);

        if (t.status === TitleStatus.PAID && t.paymentDate) {
          const payDate = new Date(t.paymentDate);
          const daysLate = Math.max(0, diffDays(payDate, dueDate));

          if (dueDate < cutoff) {
            // Título histórico: pago antes do período recente
            entry.historical.push({ daysLate });
          } else {
            // Título recente já pago
            entry.recent.push({ isLate: daysLate > 0, daysLate, openAmount: 0 });
          }
        } else if (
          (t.status === TitleStatus.OPEN || t.status === TitleStatus.OVERDUE) &&
          dueDate >= cutoff
        ) {
          // Título recente ainda em aberto
          const daysOverdue = diffDays(now, dueDate);
          const isLate = daysOverdue > 0;
          entry.recent.push({
            isLate,
            daysLate: isLate ? daysOverdue : 0,
            openAmount: t.openAmount,
          });
          if (isLate) entry.totalOpen += t.openAmount;
        }

        byCustomer.set(key, entry);
      }

      // ── Filtrar e calcular score ───────────────────────────────────────────
      const results: {
        customerId: string;
        customerName: string;
        knownName: string | null;
        document: string | null;
        historicalCount: number;
        historicalOnTimeRate: number;
        historicalAvgDelayDays: number;
        recentTotal: number;
        recentLateCount: number;
        recentLateRate: number;
        recentAvgDelayDays: number;
        totalOpen: number;
        severity: "MILD" | "MODERATE" | "SEVERE";
      }[] = [];

      for (const c of byCustomer.values()) {
        // Precisa de base histórica suficiente
        if (c.historical.length < 3) continue;

        // Calcular métricas históricas
        const histOnTimeCount = c.historical.filter((h) => h.daysLate === 0).length;
        const histOnTimeRate = histOnTimeCount / c.historical.length;
        const histLate = c.historical.filter((h) => h.daysLate > 0);
        const histAvgDelay =
          histLate.length > 0
            ? Math.round(histLate.reduce((s, h) => s + h.daysLate, 0) / histLate.length)
            : 0;

        // Só inclui quem era bom pagador historicamente
        if (histOnTimeRate < 0.7) continue;

        // Precisa de pelo menos 1 título no período recente
        if (c.recent.length === 0) continue;

        // Calcular métricas recentes
        const recentLate = c.recent.filter((r) => r.isLate);
        const recentLateRate = recentLate.length / c.recent.length;

        // Só inclui se a taxa de atraso recente for relevante
        if (recentLateRate < 0.3) continue;

        const recentAvgDelay =
          recentLate.length > 0
            ? Math.round(recentLate.reduce((s, r) => s + r.daysLate, 0) / recentLate.length)
            : 0;

        const severity: "MILD" | "MODERATE" | "SEVERE" =
          recentLateRate >= 0.7 ? "SEVERE" :
          recentLateRate >= 0.5 ? "MODERATE" : "MILD";

        results.push({
          customerId: c.customerId,
          customerName: c.customerName,
          knownName: c.knownName,
          document: c.document,
          historicalCount: c.historical.length,
          historicalOnTimeRate: Math.round(histOnTimeRate * 1000) / 1000,
          historicalAvgDelayDays: histAvgDelay,
          recentTotal: c.recent.length,
          recentLateCount: recentLate.length,
          recentLateRate: Math.round(recentLateRate * 1000) / 1000,
          recentAvgDelayDays: recentAvgDelay,
          totalOpen: c.totalOpen,
          severity,
        });
      }

      // Ordenar por severidade e depois por taxa de atraso recente
      const severityOrder = { SEVERE: 0, MODERATE: 1, MILD: 2 };
      results.sort(
        (a, b) =>
          severityOrder[a.severity] - severityOrder[b.severity] ||
          b.recentLateRate - a.recentLateRate
      );

      return {
        items: results,
        totals: {
          total: results.length,
          severe: results.filter((r) => r.severity === "SEVERE").length,
          moderate: results.filter((r) => r.severity === "MODERATE").length,
          mild: results.filter((r) => r.severity === "MILD").length,
          totalOpenAtRisk: results.reduce((s, r) => s + r.totalOpen, 0),
        },
        recentMonths: q.recentMonths,
      };
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 10. ANÁLISE COMPLETA DE COMPORTAMENTO
  //     Um único endpoint que computa 10 sub-relatórios comportamentais
  //     em um único passo sobre os dados de títulos.
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/behavior-full",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(
        z.object({ recentMonths: z.coerce.number().optional().default(3) }),
        request.query
      );

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - q.recentMonths);

      // Único fetch de todos os títulos relevantes
      const titles = await prisma.arTitle.findMany({
        where: {
          companyId,
          status: { in: [TitleStatus.PAID, TitleStatus.OPEN, TitleStatus.OVERDUE] },
          customerId: { not: null },
        },
        include: {
          customer: { select: { id: true, name: true, knownName: true, document: true } },
        },
      });

      // ── Estrutura por cliente ─────────────────────────────────────────────
      type PaidEntry = {
        dueDate: Date; paymentDate: Date; amount: number;
        daysToPayment: number; month: string; isHistorical: boolean;
      };
      type OpenEntry = {
        dueDate: Date; openAmount: number; daysOverdue: number; dueMth: string;
      };
      type CustomerRaw = {
        customerId: string; customerName: string;
        knownName: string | null; document: string | null;
        paid: PaidEntry[];
        open: OpenEntry[];
        billingByMonth: Map<string, number>;
        lastPaymentDate: Date | null;
      };

      const byCustomer = new Map<string, CustomerRaw>();
      let totalOpenAR = 0;

      const avgArr = (arr: number[]) =>
        arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

      for (const t of titles) {
        if (!t.customerId || !t.customer) continue;
        const key = t.customerId;
        const entry: CustomerRaw = byCustomer.get(key) ?? {
          customerId: t.customerId,
          customerName: t.customer.name,
          knownName: t.customer.knownName ?? null,
          document: t.customer.document ?? null,
          paid: [], open: [],
          billingByMonth: new Map(),
          lastPaymentDate: null,
        };

        // Billing trend (todos os títulos por mês de emissão)
        const issueMth = monthKey(new Date(t.issueDate));
        entry.billingByMonth.set(issueMth, (entry.billingByMonth.get(issueMth) ?? 0) + t.amount);

        if (t.status === TitleStatus.PAID && t.paymentDate) {
          const dueDate = new Date(t.dueDate);
          const paymentDate = new Date(t.paymentDate);
          const daysToPayment = diffDays(paymentDate, dueDate);
          const month = monthKey(paymentDate);
          entry.paid.push({ dueDate, paymentDate, amount: t.amount, daysToPayment, month, isHistorical: dueDate < cutoff });
          if (!entry.lastPaymentDate || paymentDate > entry.lastPaymentDate)
            entry.lastPaymentDate = paymentDate;
        } else if (t.status === TitleStatus.OPEN || t.status === TitleStatus.OVERDUE) {
          const dueDate = new Date(t.dueDate);
          const daysOverdue = Math.max(0, diffDays(now, dueDate));
          if (t.openAmount > 0) {
            entry.open.push({ dueDate, openAmount: t.openAmount, daysOverdue, dueMth: monthKey(dueDate) });
            totalOpenAR += t.openAmount;
          }
        }

        byCustomer.set(key, entry);
      }

      // ── Sub-relatórios ────────────────────────────────────────────────────

      const deteriorating: unknown[] = [];
      const onLimit: unknown[] = [];
      const stoppedAnticipating: unknown[] = [];
      const increasingOpen: unknown[] = [];
      const recurringSmall: unknown[] = [];
      const alternating: unknown[] = [];
      const reducedPurchases: unknown[] = [];
      const concentrated: unknown[] = [];
      const criticalRiskArr: unknown[] = [];
      const recovered: unknown[] = [];

      // Normalization denominators (computed first for Report 10)
      const allOpen = Array.from(byCustomer.values()).map((c) =>
        c.open.reduce((s, o) => s + o.openAmount, 0)
      );
      const maxOpen = allOpen.length > 0 ? Math.max(...allOpen) : 1;
      const allOverdueCount = Array.from(byCustomer.values()).map((c) =>
        c.open.filter((o) => o.daysOverdue > 0).length
      );
      const maxOverdueCount = allOverdueCount.length > 0 ? Math.max(...allOverdueCount) : 1;

      for (const c of byCustomer.values()) {
        const base = {
          customerId: c.customerId, customerName: c.customerName,
          knownName: c.knownName, document: c.document,
        };

        const histPaid = c.paid.filter((p) => p.isHistorical);
        const recentPaid = c.paid.filter((p) => !p.isHistorical);
        const totalOpenAmt = c.open.reduce((s, o) => s + o.openAmount, 0);
        const overdueOpen = c.open.filter((o) => o.daysOverdue > 0);

        // ── Relatório 2: Piorando mês a mês ────────────────────────────────
        {
          const mthMap = new Map<string, number[]>();
          for (const p of c.paid) {
            if (!mthMap.has(p.month)) mthMap.set(p.month, []);
            mthMap.get(p.month)!.push(p.daysToPayment);
          }
          const months = [...mthMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([m, ds]) => ({ month: m, avgDays: Math.round(avgArr(ds) * 10) / 10 }));

          if (months.length >= 4) {
            const half = Math.floor(months.length / 2);
            const firstAvg = avgArr(months.slice(0, half).map((m) => m.avgDays));
            const lastAvg = avgArr(months.slice(-half).map((m) => m.avgDays));
            const delta = lastAvg - firstAvg;
            if (delta >= 5) {
              deteriorating.push({
                ...base,
                monthlyAvgDelay: months,
                firstHalfAvg: Math.round(firstAvg * 10) / 10,
                secondHalfAvg: Math.round(lastAvg * 10) / 10,
                trendDelta: Math.round(delta * 10) / 10,
              });
            }
          }
        }

        // ── Relatório 3: Paga no limite ─────────────────────────────────────
        {
          if (c.paid.length >= 5) {
            const nearLimit = c.paid.filter((p) => p.daysToPayment >= -3 && p.daysToPayment <= 7);
            const pctNear = nearLimit.length / c.paid.length;
            const avgDays = avgArr(c.paid.map((p) => p.daysToPayment));
            if (pctNear >= 0.65 && avgDays >= -3 && avgDays <= 10) {
              onLimit.push({
                ...base,
                totalPaid: c.paid.length,
                pctNearLimit: Math.round(pctNear * 1000) / 1000,
                avgDaysToPayment: Math.round(avgDays * 10) / 10,
                earlyCount: c.paid.filter((p) => p.daysToPayment < 0).length,
                onTimeCount: c.paid.filter((p) => p.daysToPayment === 0).length,
                lateCount: c.paid.filter((p) => p.daysToPayment > 0).length,
              });
            }
          }
        }

        // ── Relatório 4: Deixou de antecipar ───────────────────────────────
        {
          if (histPaid.length >= 3) {
            const histAvg = avgArr(histPaid.map((p) => p.daysToPayment));
            if (histAvg < -2 && recentPaid.length >= 1) {
              const recentAvg = avgArr(recentPaid.map((p) => p.daysToPayment));
              const delta = recentAvg - histAvg;
              if (delta >= 5) {
                stoppedAnticipating.push({
                  ...base,
                  historicalAvg: Math.round(histAvg * 10) / 10,
                  recentAvg: Math.round(recentAvg * 10) / 10,
                  delta: Math.round(delta * 10) / 10,
                  historicalCount: histPaid.length,
                  recentCount: recentPaid.length,
                });
              }
            }
          }
        }

        // ── Relatório 5: Volume em aberto crescendo ─────────────────────────
        {
          const mthMap = new Map<string, number>();
          for (const o of c.open) {
            mthMap.set(o.dueMth, (mthMap.get(o.dueMth) ?? 0) + o.openAmount);
          }
          const months = [...mthMap.entries()].sort(([a], [b]) => a.localeCompare(b));
          if (months.length >= 3) {
            const half = Math.floor(months.length / 2);
            const firstAvg = avgArr(months.slice(0, half).map(([, v]) => v));
            const lastAvg = avgArr(months.slice(-half).map(([, v]) => v));
            if (lastAvg > firstAvg * 1.4 && lastAvg > 0) {
              increasingOpen.push({
                ...base,
                totalOpen: totalOpenAmt,
                overdueCount: overdueOpen.length,
                openByMonth: months.map(([month, amount]) => ({ month, amount })),
                firstHalfAvg: Math.round(firstAvg),
                recentHalfAvg: Math.round(lastAvg),
                growthPct: firstAvg > 0 ? Math.round(((lastAvg - firstAvg) / firstAvg) * 1000) / 10 : 999,
              });
            }
          }
        }

        // ── Relatório 6: Atraso recorrente em parcelas pequenas ─────────────
        {
          if (c.paid.length >= 5) {
            const amounts = c.paid.map((p) => p.amount).sort((a, b) => a - b);
            const medianAmt = amounts[Math.floor(amounts.length / 2)];
            const smallLate = c.paid.filter((p) => p.daysToPayment > 0 && p.amount < medianAmt);
            const smallLateRate = smallLate.length / c.paid.length;
            if (smallLate.length >= 3 && smallLateRate >= 0.25) {
              const avgDelay = avgArr(smallLate.map((p) => p.daysToPayment));
              recurringSmall.push({
                ...base,
                totalPaid: c.paid.length,
                smallLateCount: smallLate.length,
                smallLateRate: Math.round(smallLateRate * 1000) / 1000,
                medianAmount: Math.round(medianAmt),
                avgSmallDelay: Math.round(avgDelay * 10) / 10,
              });
            }
          }
        }

        // ── Relatório 7: Alternância de comportamento ───────────────────────
        {
          const mthMap = new Map<string, { late: number; total: number }>();
          for (const p of c.paid) {
            const entry2 = mthMap.get(p.month) ?? { late: 0, total: 0 };
            entry2.total++;
            if (p.daysToPayment > 0) entry2.late++;
            mthMap.set(p.month, entry2);
          }
          const months = [...mthMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([m, d]) => ({ month: m, lateRate: d.total > 0 ? d.late / d.total : 0 }));

          if (months.length >= 5) {
            let transitions = 0;
            for (let i = 1; i < months.length; i++) {
              const prev = months[i - 1].lateRate;
              const curr = months[i].lateRate;
              if ((prev < 0.3 && curr > 0.6) || (prev > 0.6 && curr < 0.3)) transitions++;
            }
            if (transitions >= 2) {
              const rates = months.map((m) => m.lateRate);
              const avgRate = avgArr(rates);
              const variance = avgArr(rates.map((r) => (r - avgRate) ** 2));
              alternating.push({
                ...base,
                transitions,
                monthCount: months.length,
                monthlyLateRates: months,
                avgLateRate: Math.round(avgRate * 1000) / 1000,
                volatility: Math.round(Math.sqrt(variance) * 1000) / 1000,
              });
            }
          }
        }

        // ── Relatório 8: Redução de compras + piora no pagamento ────────────
        {
          const billing = [...c.billingByMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
          if (billing.length >= 4) {
            const half = Math.floor(billing.length / 2);
            const firstBill = avgArr(billing.slice(0, half).map(([, v]) => v));
            const lastBill = avgArr(billing.slice(-half).map(([, v]) => v));
            const billingDecline = firstBill > 0 ? (firstBill - lastBill) / firstBill : 0;

            if (billingDecline >= 0.2 && c.paid.length >= 4) {
              const histLate = histPaid.filter((p) => p.daysToPayment > 0).length;
              const histRate = histPaid.length > 0 ? histLate / histPaid.length : 0;
              const recLate = recentPaid.filter((p) => p.daysToPayment > 0).length;
              const recRate = recentPaid.length > 0 ? recLate / recentPaid.length : 0;

              if (recRate > histRate + 0.1 || (overdueOpen.length > 0 && billingDecline >= 0.25)) {
                reducedPurchases.push({
                  ...base,
                  firstHalfAvgBilling: Math.round(firstBill),
                  recentHalfAvgBilling: Math.round(lastBill),
                  billingDeclinePct: Math.round(billingDecline * 1000) / 10,
                  historicalLateRate: Math.round(histRate * 1000) / 1000,
                  recentLateRate: Math.round(recRate * 1000) / 1000,
                  totalOpen: totalOpenAmt,
                });
              }
            }
          }
        }

        // ── Relatório 9: Risco concentrado ─────────────────────────────────
        {
          if (totalOpenAmt > 0) {
            const concentrationPct = totalOpenAR > 0 ? totalOpenAmt / totalOpenAR : 0;
            if (concentrationPct >= 0.02) {
              concentrated.push({
                ...base,
                totalOpen: totalOpenAmt,
                overdueCount: overdueOpen.length,
                overdueAmount: overdueOpen.reduce((s, o) => s + o.openAmount, 0),
                concentrationPct: Math.round(concentrationPct * 10000) / 100,
                totalOpenAR: Math.round(totalOpenAR),
              });
            }
          }
        }

        // ── Relatório 10: Risco de inadimplência crítica ────────────────────
        {
          const overdueAmt = overdueOpen.reduce((s, o) => s + o.openAmount, 0);
          const overdueCount2 = overdueOpen.length;
          const recentAvgDelay = recentPaid.length > 0
            ? avgArr(recentPaid.filter((p) => p.daysToPayment > 0).map((p) => p.daysToPayment))
            : (overdueOpen.length > 0 ? avgArr(overdueOpen.map((o) => o.daysOverdue)) : 0);
          const histLateR = histPaid.length > 0
            ? histPaid.filter((p) => p.daysToPayment > 0).length / histPaid.length : 0;
          const recLateR = (() => {
            const total = recentPaid.length + overdueOpen.length;
            if (total === 0) return 0;
            const late = recentPaid.filter((p) => p.daysToPayment > 0).length + overdueOpen.length;
            return late / total;
          })();
          const behaviorDelta = Math.max(0, recLateR - histLateR);
          const daysSincePayment = c.lastPaymentDate
            ? diffDays(now, c.lastPaymentDate) : 365;

          const s1 = recentAvgDelay > 0 ? Math.min(recentAvgDelay / 90, 1) : 0;
          const s2 = overdueCount2 > 0 ? Math.min(overdueCount2 / maxOverdueCount, 1) : 0;
          const s3 = totalOpenAR > 0 ? Math.min(overdueAmt / totalOpenAR * 20, 1) : 0;
          const s4 = Math.min(behaviorDelta, 1);
          const s5 = Math.min(daysSincePayment / 180, 1);
          const score = Math.round((0.25 * s1 + 0.25 * s2 + 0.20 * s3 + 0.15 * s4 + 0.15 * s5) * 100);

          if (score >= 25 && (overdueCount2 > 0 || recLateR > 0.3)) {
            const riskLevel = score >= 65 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
            criticalRiskArr.push({
              ...base,
              score,
              riskLevel,
              recentAvgDelayDays: Math.round(recentAvgDelay),
              overdueCount: overdueCount2,
              overdueAmount: overdueAmt,
              behaviorDelta: Math.round(behaviorDelta * 1000) / 1000,
              daysSinceLastPayment: c.lastPaymentDate ? daysSincePayment : null,
              totalOpen: totalOpenAmt,
            });
          }
        }

        // ── Relatório 16: Clientes recuperados ─────────────────────────────
        {
          if (histPaid.length >= 3 && recentPaid.length >= 1) {
            const histLateR = histPaid.filter((p) => p.daysToPayment > 0).length / histPaid.length;
            const recLateR = recentPaid.filter((p) => p.daysToPayment > 0).length / recentPaid.length;
            const improvement = histLateR - recLateR;
            if (histLateR >= 0.4 && recLateR <= 0.25 && improvement >= 0.2) {
              recovered.push({
                ...base,
                historicalLateRate: Math.round(histLateR * 1000) / 1000,
                recentLateRate: Math.round(recLateR * 1000) / 1000,
                improvement: Math.round(improvement * 1000) / 1000,
                historicalCount: histPaid.length,
                recentCount: recentPaid.length,
                recentAvgDelay: Math.round(avgArr(recentPaid.map((p) => p.daysToPayment))),
              });
            }
          }
        }
      } // end for(byCustomer)

      // Sort each report
      (deteriorating as { trendDelta: number }[]).sort((a, b) => b.trendDelta - a.trendDelta);
      (concentrated as { concentrationPct: number }[]).sort((a, b) => b.concentrationPct - a.concentrationPct);
      (criticalRiskArr as { score: number }[]).sort((a, b) => b.score - a.score);
      (recovered as { improvement: number }[]).sort((a, b) => b.improvement - a.improvement);
      (reducedPurchases as { billingDeclinePct: number }[]).sort((a, b) => b.billingDeclinePct - a.billingDeclinePct);
      (increasingOpen as { growthPct: number }[]).sort((a, b) => b.growthPct - a.growthPct);
      (recurringSmall as { smallLateCount: number }[]).sort((a, b) => b.smallLateCount - a.smallLateCount);
      (alternating as { transitions: number }[]).sort((a, b) => b.transitions - a.transitions);
      (stoppedAnticipating as { delta: number }[]).sort((a, b) => b.delta - a.delta);
      (onLimit as { pctNearLimit: number }[]).sort((a, b) => b.pctNearLimit - a.pctNearLimit);

      return {
        recentMonths: q.recentMonths,
        deteriorating,
        onLimit,
        stoppedAnticipating,
        increasingOpen,
        recurringSmall,
        alternating,
        reducedPurchases,
        concentrated,
        criticalRisk: criticalRiskArr,
        recovered,
        totalOpenAR: Math.round(totalOpenAR),
      };
    }
  );
}
