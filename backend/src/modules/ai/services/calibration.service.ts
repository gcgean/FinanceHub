import { prisma } from "../../../lib/prisma.js";
import { subDays } from "date-fns";
import { AIInsightRule } from "@prisma/client";

export class CalibrationService {
  
  /**
   * Executa a calibração de todas as regras baseada no feedback dos usuários.
   * Pode ser rodado via cron semanalmente.
   */
  async runCalibrationCycle() {
    console.log("[CalibrationService] Iniciando ciclo de calibração...");
    
    const rules = await prisma.aIInsightRule.findMany({
      where: { enabled: true }
    });

    for (const rule of rules) {
      await this.calibrateRule(rule.id);
    }
    
    console.log("[CalibrationService] Ciclo de calibração concluído.");
  }

  private async calibrateRule(ruleId: string) {
    const rule = await prisma.aIInsightRule.findUnique({ where: { id: ruleId } });
    if (!rule) return;

    // Buscar feedbacks dos últimos 30 dias
    const sinceDate = subDays(new Date(), 30);
    
    // Total de feedbacks relevantes (ignorando 'OTHER')
    const feedbacks = await prisma.aIInsightFeedback.findMany({
      where: {
        insightEvent: { ruleId: rule.id },
        createdAt: { gte: sinceDate },
        feedbackType: { in: ['USEFUL', 'FALSE_POSITIVE', 'IRRELEVANT', 'TOO_FREQUENT'] }
      }
    });

    if (feedbacks.length < 5) {
      console.log(`[CalibrationService] Regra ${rule.code}: Dados insuficientes para calibração (${feedbacks.length} feedbacks).`);
      return;
    }

    const falsePositives = feedbacks.filter(f => f.feedbackType === 'FALSE_POSITIVE' || f.feedbackType === 'IRRELEVANT').length;
    const fpRate = falsePositives / feedbacks.length;

    console.log(`[CalibrationService] Regra ${rule.code}: Taxa de rejeição ${Math.round(fpRate * 100)}% (${falsePositives}/${feedbacks.length})`);

    // Se a taxa de rejeição for alta (> 30%), ajustar parâmetros
    if (fpRate > 0.3) {
      await this.adjustRuleParameters(rule, "LOOSEN"); // Tornar menos sensível
    } else if (fpRate < 0.05 && feedbacks.length > 20) {
      // Se a taxa for muito baixa, talvez possamos ser mais agressivos (opcional)
      // await this.adjustRuleParameters(rule, "TIGHTEN"); 
    }
  }

  private async adjustRuleParameters(rule: AIInsightRule, direction: "LOOSEN" | "TIGHTEN") {
    const config = parseConfig(rule.conditionsJson);
    if (!config) return;

    let updated = false;

    if (rule.code === 'REVENUE_DROP_WEEKLY') {
      // Threshold atual (ex: 0.7 = 70% da média). 
      // LOOSEN: Queremos que dispare menos. Então o faturamento tem que cair MAIS.
      // Se hoje dispara com < 70%, ajustamos para < 60% (0.6).
      // Ou seja, diminuir o threshold.
      
      const current = typeof config.threshold === "number" ? config.threshold : 0.7;
      const step = 0.05;
      
      if (direction === "LOOSEN") {
        config.threshold = Math.max(0.5, current - step); // Min 0.5
        console.log(`[CalibrationService] Ajustando ${rule.code}: threshold ${current} -> ${config.threshold}`);
        updated = true;
      }
    } 
    else if (rule.code === 'EXPENSE_SPIKE') {
      // Multiplier atual (ex: 2.0 = 2x a média).
      // LOOSEN: Queremos que dispare menos. A despesa tem que ser MAIOR.
      // Aumentar o multiplier (2.0 -> 2.5).
      
      const current = typeof config.multiplier === "number" ? config.multiplier : 2.0;
      const step = 0.5;

      if (direction === "LOOSEN") {
        config.multiplier = Math.min(10.0, current + step); // Max 10x
        console.log(`[CalibrationService] Ajustando ${rule.code}: multiplier ${current} -> ${config.multiplier}`);
        updated = true;
      }
    }
    // Adicionar lógica para CHURN_RISK se parametrizável (ex: dias de atraso)

    if (updated) {
      await prisma.aIInsightRule.update({
        where: { id: rule.id },
        data: { conditionsJson: JSON.stringify(config) }
      });
      // TODO: Criar log de auditoria dessa alteração
    }
  }
}

export const calibrationService = new CalibrationService();

function parseConfig(value: string): { threshold?: number; multiplier?: number } | null {
  try {
    return JSON.parse(value) as { threshold?: number; multiplier?: number };
  } catch {
    return null;
  }
}
