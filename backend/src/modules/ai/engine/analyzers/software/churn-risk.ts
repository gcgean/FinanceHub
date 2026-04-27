import { startOfDay, subDays } from "date-fns";
import { prisma } from "../../../../../lib/prisma.js";
import { InsightAnalyzer } from "../../types.js";
import { AIInsightRule, AIInsightSeverity } from "@prisma/client";

export const churnRiskAnalyzer: InsightAnalyzer = {
  code: "CHURN_RISK_SOFTWARE",
  name: "Risco de Churn (Inadimplência)",
  description: "Detecta clientes com múltiplos títulos vencidos recentemente, indicando risco de cancelamento.",
  insightType: "CUSTOMER_RISK",
  severityDefault: "HIGH",
  segment: "SOFTWARE",

  async analyze(companyId: string, rule: AIInsightRule) {
    const config = parseConditions(rule.conditionsJson);
    const minOverdueCount = typeof config?.minOverdueCount === "number" ? config.minOverdueCount : 2;
    const lookbackDays = typeof config?.lookbackDays === "number" ? config.lookbackDays : 60;

    // Buscar clientes com títulos vencidos nos últimos X dias
    const today = startOfDay(new Date());
    const cutoffDate = subDays(today, lookbackDays);

    // Contar títulos vencidos por cliente
    const overdueTitles = await prisma.arTitle.groupBy({
      by: ['customerId'],
      where: {
        companyId,
        status: 'OVERDUE',
        dueDate: {
          gte: cutoffDate,
          lte: today
        }
      },
      _count: {
        id: true
      },
      _sum: {
        openAmount: true
      },
      having: {
        id: {
          _count: {
            gte: minOverdueCount
          }
        }
      }
    });

    if (overdueTitles.length === 0) return null;

    // Se houver muitos, pegar os top 3 mais críticos
    const topRisks = overdueTitles
      .sort((a, b) => (b._sum.openAmount || 0) - (a._sum.openAmount || 0))
      .slice(0, 3);

    // Precisamos dos nomes dos clientes
    const customerIds = topRisks.map(t => t.customerId).filter(id => id !== null) as string[];
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true }
    });

    const riskDetails = topRisks.map(r => {
      const customer = customers.find(c => c.id === r.customerId);
      return {
        name: customer?.name || "Cliente Desconhecido",
        overdueCount: r._count.id,
        amount: r._sum.openAmount || 0
      };
    });

    const customerNames = riskDetails.map(d => d.name).join(", ");

    return {
      title: "Risco de Churn Detectado",
      summary: `${riskDetails.length} clientes apresentam sinais de risco de churn (inadimplência recorrente): ${customerNames}.`,
      severity: rule.severityDefault,
      status: "NEW",
      sourceType: "RULE_ENGINE",
      metricReference: "ar_overdue_count",
      payloadJson: JSON.stringify({ riskDetails }),
    };
  }
};

function parseConditions(value: string): { minOverdueCount?: number; lookbackDays?: number } | null {
  try {
    return JSON.parse(value) as { minOverdueCount?: number; lookbackDays?: number };
  } catch {
    return null;
  }
}
