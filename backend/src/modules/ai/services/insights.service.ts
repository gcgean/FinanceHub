import { prisma } from "../../../lib/prisma";
import { notificationService } from "./notification.service";
import { insightEngineRegistry } from "../engine/registry";
import { 
  TransactionType, 
  AIInsightSeverity, 
  AIInsightStatus, 
  AIInsightSourceType, 
  AIInsightRule,
  Prisma 
} from "@prisma/client";
import { startOfDay, endOfDay, subDays, format, subWeeks, startOfWeek, endOfWeek } from "date-fns";

export class InsightsService {
  /**
   * Avalia regras e gera insights automáticos
   */
  async runInsightEngine(companyId: string) {
    console.log(`[InsightEngine] Iniciando análise para empresa ${companyId}`);
    
    // 1. Buscar regras habilitadas
    const rules = await prisma.aIInsightRule.findMany({
      where: {
        OR: [{ companyId: null }, { companyId }],
        enabled: true,
      },
    });

    console.log(`[InsightEngine] ${rules.length} regras encontradas.`);
    const events = [];

    // 2. Avaliar cada regra
    for (const rule of rules) {
      try {
        const event = await this.evaluateRule(companyId, rule);
        if (event) {
          events.push(event);
        }
      } catch (error) {
        console.error(`[InsightEngine] Erro ao avaliar regra ${rule.code}:`, error);
      }
    }

    return events;
  }

  private async evaluateRule(companyId: string, rule: AIInsightRule) {
    const analyzer = insightEngineRegistry.getAnalyzer(rule.code);
    
    if (!analyzer) {
      // Fallback para hardcoded antigo se não achar no registry (opcional, mas vou remover para forçar uso do registry)
      console.warn(`[InsightEngine] Analyzer não encontrado para regra: ${rule.code}`);
      return null;
    }

    const result = await analyzer.analyze(companyId, rule);

    if (result) {
      return this.createInsightEvent({
        companyId,
        ruleId: rule.id,
        title: result.title,
        summary: result.summary,
        severity: result.severity,
        insightType: rule.insightType,
        metricReference: result.metricReference || undefined,
        payload: result.payloadJson ? JSON.parse(result.payloadJson) : undefined
      });
    }

    return null;
  }

  async createInsightEvent(params: {
    companyId: string;
    ruleId?: string;
    title: string;
    summary: string;
    severity: AIInsightSeverity;
    insightType: string;
    metricReference?: string;
    payload?: Record<string, unknown>;
  }) {
    // Evitar duplicidade: verificar se já existe insight igual (mesma regra, mesma data/semana)
    // Para simplificar, verificamos se existe um insight NEW/SENT criado hoje com mesma regra
    const startOfToday = startOfDay(new Date());
    
    const existing = await prisma.aIInsightEvent.findFirst({
      where: {
        companyId: params.companyId,
        ruleId: params.ruleId,
        createdAt: { gte: startOfToday },
        status: { not: AIInsightStatus.DISMISSED }
      }
    });

    if (existing) return null; // Já gerado hoje

    const event = await prisma.aIInsightEvent.create({
      data: {
        companyId: params.companyId,
        ruleId: params.ruleId,
        title: params.title,
        summary: params.summary,
        severity: params.severity,
        status: AIInsightStatus.NEW,
        sourceType: AIInsightSourceType.RULE_ENGINE,
        metricReference: params.metricReference,
        payloadJson: params.payload ? JSON.stringify(params.payload) : null,
      }
    });

    // Criar destinatários (todos os admins/operators por enquanto)
    // Futuro: filtrar por setor
    const users = await prisma.user.findMany({
      where: { companyId: params.companyId, role: { in: ['ADMIN', 'OPERATOR'] } }
    });

    for (const user of users) {
      await prisma.aIInsightRecipient.create({
        data: {
          insightEventId: event.id,
          userId: user.id,
          channelType: "IN_APP", // Default
          deliveryStatus: "PENDING"
        }
      });
    }

    // Disparar notificações para os destinatários criados
    await notificationService.dispatchInsightEvent(event.id);

    return event;
  }

  /**
   * Gera um snapshot diário das principais métricas financeiras.
   * Deve ser executado via CRON (ex: toda meia-noite).
   */
  async generateDailySnapshot(companyId: string, date: Date = new Date()) {
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    // 1. Calcular métricas do dia
    const txs = await prisma.transaction.findMany({
      where: {
        companyId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const revenue = txs
      .filter((t) => t.type === TransactionType.REVENUE)
      .reduce((sum, t) => sum + t.value, 0);

    const expense = txs
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + Math.abs(t.value), 0);

    const netIncome = revenue - expense;

    // 2. Salvar Snapshots
    // Receita
    await prisma.aIMetricSnapshot.upsert({
      where: {
        companyId_metricKey_date_granularity: {
          companyId,
          metricKey: "revenue",
          date: startDate,
          granularity: "D",
        },
      },
      update: { value: revenue },
      create: {
        companyId,
        metricKey: "revenue",
        date: startDate,
        granularity: "D",
        value: revenue,
      },
    });

    // Despesa
    await prisma.aIMetricSnapshot.upsert({
      where: {
        companyId_metricKey_date_granularity: {
          companyId,
          metricKey: "expense",
          date: startDate,
          granularity: "D",
        },
      },
      update: { value: expense },
      create: {
        companyId,
        metricKey: "expense",
        date: startDate,
        granularity: "D",
        value: expense,
      },
    });

    // Resultado Líquido
    await prisma.aIMetricSnapshot.upsert({
      where: {
        companyId_metricKey_date_granularity: {
          companyId,
          metricKey: "net_income",
          date: startDate,
          granularity: "D",
        },
      },
      update: { value: netIncome },
      create: {
        companyId,
        metricKey: "net_income",
        date: startDate,
        granularity: "D",
        value: netIncome,
      },
    });

    // 3. Métricas de Títulos (Posição atual do dia)
    const payables = await prisma.apTitle.aggregate({
      where: { companyId, status: 'OPEN' },
      _sum: { openAmount: true }
    });
    const totalPayables = payables._sum.openAmount || 0;

    await prisma.aIMetricSnapshot.upsert({
      where: {
        companyId_metricKey_date_granularity: {
          companyId,
          metricKey: "accounts_payable",
          date: startDate,
          granularity: "D",
        },
      },
      update: { value: totalPayables },
      create: {
        companyId,
        metricKey: "accounts_payable",
        date: startDate,
        granularity: "D",
        value: totalPayables,
      },
    });

    const receivables = await prisma.arTitle.aggregate({
      where: { companyId, status: 'OPEN' },
      _sum: { openAmount: true }
    });
    const totalReceivables = receivables._sum.openAmount || 0;

    await prisma.aIMetricSnapshot.upsert({
      where: {
        companyId_metricKey_date_granularity: {
          companyId,
          metricKey: "accounts_receivable",
          date: startDate,
          granularity: "D",
        },
      },
      update: { value: totalReceivables },
      create: {
        companyId,
        metricKey: "accounts_receivable",
        date: startDate,
        granularity: "D",
        value: totalReceivables,
      },
    });

    return { revenue, expense, netIncome, totalPayables, totalReceivables };
  }

  /**
   * Recupera histórico de métricas para análise de tendências.
   */
  async getMetricHistory(companyId: string, metricKey: string, days = 30) {
    const startDate = subDays(new Date(), days);

    return prisma.aIMetricSnapshot.findMany({
      where: {
        companyId,
        metricKey,
        granularity: "D",
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });
  }

  /**
   * Gera insights textuais baseados nos snapshots recentes.
   * Útil para injetar no contexto do Chat.
   */
  async getFinancialContext(companyId: string): Promise<string> {
    const revenueHistory = await this.getMetricHistory(companyId, "revenue", 7);
    const expenseHistory = await this.getMetricHistory(companyId, "expense", 7);

    if (revenueHistory.length === 0) return "Sem dados históricos suficientes para análise.";

    const totalRevenue7d = revenueHistory.reduce((a, b) => a + b.value, 0);
    const totalExpense7d = expenseHistory.reduce((a, b) => a + b.value, 0);
    const result7d = totalRevenue7d - totalExpense7d;

    return `
    Resumo financeiro dos últimos 7 dias:
    - Receita Total: R$ ${totalRevenue7d.toFixed(2)}
    - Despesa Total: R$ ${totalExpense7d.toFixed(2)}
    - Resultado: R$ ${result7d.toFixed(2)}
    
    Tendência: ${result7d >= 0 ? "Positiva" : "Negativa (Atenção)"}.
    `;
  }
}

export const insightsService = new InsightsService();
