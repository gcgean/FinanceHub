import { startOfDay, subDays } from "date-fns";
import { prisma } from "../../../../../lib/prisma.js";
import { InsightAnalyzer } from "../../types.js";
import { AIInsightRule } from "@prisma/client";

export const expenseSpikeAnalyzer: InsightAnalyzer = {
  code: "EXPENSE_SPIKE",
  name: "Pico de despesas detectado",
  description: "Detecta se a despesa do dia atual está muito acima da média dos últimos 30 dias.",
  insightType: "FINANCIAL_RISK",
  severityDefault: "MEDIUM",
  segment: "GENERIC",

  async analyze(companyId: string, rule: AIInsightRule) {
    const today = startOfDay(new Date());
    const last30Days = subDays(today, 30);

    const snapshots = await prisma.aIMetricSnapshot.findMany({
      where: {
        companyId,
        metricKey: "expense",
        date: { gte: last30Days },
        granularity: "D",
      },
    });

    const todaySnapshot = snapshots.find(s => s.date.getTime() === today.getTime());
    if (!todaySnapshot) return null;

    const pastSnapshots = snapshots.filter(s => s.date.getTime() !== today.getTime());
    if (pastSnapshots.length < 10) return null;

    const totalPast = pastSnapshots.reduce((sum, s) => sum + s.value, 0);
    const avgExpense = totalPast / pastSnapshots.length;

    const config = parseConditions(rule.conditionsJson);
    const multiplier = typeof config?.multiplier === "number" ? config.multiplier : 2.0;

    if (todaySnapshot.value > avgExpense * multiplier && todaySnapshot.value > 100) {
      return {
        title: "Pico de despesas detectado",
        summary: `As despesas de hoje (R$ ${todaySnapshot.value.toFixed(2)}) estão muito acima da sua média diária (R$ ${avgExpense.toFixed(2)}).`,
        severity: rule.severityDefault,
        status: "NEW",
        sourceType: "RULE_ENGINE",
        metricReference: "expense",
        payloadJson: JSON.stringify({ todayValue: todaySnapshot.value, avg: avgExpense }),
      };
    }
    return null;
  }
};

function parseConditions(value: string): { multiplier?: number } | null {
  try {
    return JSON.parse(value) as { multiplier?: number };
  } catch {
    return null;
  }
}
