import { InsightAnalyzer } from "./types.js";
import { revenueDropWeeklyAnalyzer } from "./analyzers/generic/revenue-drop-weekly.js";
import { expenseSpikeAnalyzer } from "./analyzers/generic/expense-spike.js";
import { churnRiskAnalyzer } from "./analyzers/software/churn-risk.js";

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
