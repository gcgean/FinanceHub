import { startOfDay, startOfWeek, subWeeks, subDays } from "date-fns";
import { prisma } from "../../../../../lib/prisma";
import { InsightAnalyzer } from "../../types";
import { AIInsightRule, AIInsightSeverity } from "@prisma/client";

export const revenueDropWeeklyAnalyzer: InsightAnalyzer = {
  code: "REVENUE_DROP_WEEKLY",
  name: "Queda acentuada no faturamento semanal",
  description: "Detecta se o faturamento da semana atual está significativamente abaixo da média das últimas 4 semanas.",
  insightType: "FINANCIAL_RISK",
  severityDefault: "HIGH",
  segment: "GENERIC",

  async analyze(companyId: string, rule: AIInsightRule) {
    const today = new Date();
    const currentWeekStart = startOfWeek(today);
    const last4WeeksStart = subWeeks(currentWeekStart, 4);

    // Buscar snapshots agregados
    const snapshots = await prisma.aIMetricSnapshot.findMany({
      where: {
        companyId,
        metricKey: "revenue",
        date: { gte: last4WeeksStart },
        granularity: "D",
      },
    });

    // Calcular total da semana atual
    const currentWeekRevenue = snapshots
      .filter((s) => s.date >= currentWeekStart)
      .reduce((sum, s) => sum + s.value, 0);

    // Calcular média das 4 semanas anteriores
    const pastSnapshots = snapshots.filter((s) => s.date < currentWeekStart);
    
    // Se não tiver histórico suficiente, ignora
    if (pastSnapshots.length < 7) return null;

    const pastTotal = pastSnapshots.reduce((sum, s) => sum + s.value, 0);
    const pastWeeksCount = 4; // Simplificação
    const pastWeeklyAvg = pastTotal / pastWeeksCount;

    // Se a receita atual estiver 30% abaixo da média
    // (Ajuste fino: só alertar se já passou de quarta-feira, senão é falso positivo óbvio no começo da semana)
    const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda...
    if (dayOfWeek < 3) return null; // Só avalia de quarta em diante

    // threshold vem do JSON da regra ou default 0.7
    const config = parseConditions(rule.conditionsJson);
    const threshold = typeof config?.threshold === "number" ? config.threshold : 0.7;
    
    if (currentWeekRevenue < pastWeeklyAvg * threshold) {
      return {
        title: "Queda acentuada no faturamento semanal",
        summary: `Sua receita desta semana (R$ ${currentWeekRevenue.toFixed(2)}) está abaixo da média das últimas 4 semanas (R$ ${pastWeeklyAvg.toFixed(2)}).`,
        severity: rule.severityDefault,
        status: "NEW",
        sourceType: "RULE_ENGINE",
        metricReference: "revenue",
        payloadJson: JSON.stringify({ currentWeekRevenue, pastWeeklyAvg, threshold }),
      };
    }

    return null;
  }
};

function parseConditions(value: string): { threshold?: number } | null {
  try {
    return JSON.parse(value) as { threshold?: number };
  } catch {
    return null;
  }
}
