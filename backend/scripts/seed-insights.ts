
import { PrismaClient, AIInsightSeverity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding AI Insight Rules...');

  const rules = [
    {
      code: 'REVENUE_DROP_WEEKLY',
      name: 'Queda de Faturamento Semanal',
      description: 'Detecta se o faturamento da semana atual está significativamente abaixo da média das últimas 4 semanas.',
      insightType: 'FINANCIAL_RISK',
      severityDefault: AIInsightSeverity.HIGH,
      conditionsJson: JSON.stringify({ threshold: 0.7 }),
      actionTemplate: 'Verificar pipeline de vendas e contatar principais clientes.'
    },
    {
      code: 'EXPENSE_SPIKE',
      name: 'Pico de Despesas',
      description: 'Detecta se as despesas do dia estão anormalmente altas em relação à média mensal.',
      insightType: 'FINANCIAL_ALERT',
      severityDefault: AIInsightSeverity.MEDIUM,
      conditionsJson: JSON.stringify({ multiplier: 2.0 }),
      actionTemplate: 'Revisar lançamentos de hoje no contas a pagar.'
    }
  ];

  for (const rule of rules) {
    const existing = await prisma.aIInsightRule.findUnique({ where: { code: rule.code } });
    if (!existing) {
      await prisma.aIInsightRule.create({
        data: {
          ...rule,
          enabled: true
        }
      });
      console.log(`Created rule: ${rule.code}`);
    } else {
      console.log(`Rule already exists: ${rule.code}`);
    }
  }

  console.log('Done.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
