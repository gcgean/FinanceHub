import { AIInsightRule, AIInsightEvent, Prisma } from "@prisma/client";

export interface InsightAnalyzer {
  code: string;
  name: string;
  description: string;
  insightType: string; // e.g., FINANCIAL_RISK, OPERATIONAL_OPPORTUNITY
  severityDefault: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  segment: string; // e.g., SOFTWARE, RETAIL, GENERIC
  
  /**
   * Avalia a regra para uma empresa e retorna um evento de insight se a condição for atendida.
   * Retorna null se não houver insight.
   */
  analyze(companyId: string, rule: AIInsightRule): Promise<Omit<Prisma.AIInsightEventCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'company' | 'rule' | 'sector' | 'companyId'> | null>;
}
