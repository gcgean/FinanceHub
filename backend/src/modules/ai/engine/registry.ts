import { InsightAnalyzer } from "./types";
import { revenueDropWeeklyAnalyzer } from "./analyzers/generic/revenue-drop-weekly";
import { expenseSpikeAnalyzer } from "./analyzers/generic/expense-spike";
import { churnRiskAnalyzer } from "./analyzers/software/churn-risk";

export class InsightEngineRegistry {
  private analyzers: Map<string, InsightAnalyzer> = new Map();

  constructor() {
    this.register(revenueDropWeeklyAnalyzer);
    this.register(expenseSpikeAnalyzer);
    this.register(churnRiskAnalyzer);
    // Adicionar outros analyzers aqui
  }

  register(analyzer: InsightAnalyzer) {
    this.analyzers.set(analyzer.code, analyzer);
  }

  getAnalyzer(code: string): InsightAnalyzer | undefined {
    return this.analyzers.get(code);
  }

  getAllAnalyzers(): InsightAnalyzer[] {
    return Array.from(this.analyzers.values());
  }
}

export const insightEngineRegistry = new InsightEngineRegistry();
