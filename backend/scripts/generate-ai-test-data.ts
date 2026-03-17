
import { prisma } from "../src/lib/prisma";
import { insightsService } from "../src/modules/ai/services/insights.service";
import { 
  TransactionType, 
  TransactionStatus, 
  AIInsightSeverity 
} from "@prisma/client";
import { subDays } from "date-fns";

async function main() {
  console.log("🔍 Iniciando script de teste para snapshots e AIInsightEvent...");

  // 1. Identificar ou Criar Empresa de Teste
  let company = await prisma.company.findFirst();
  if (!company) {
    console.log("⚠️ Nenhuma empresa encontrada. Criando empresa de teste...");
    company = await prisma.company.create({
      data: { name: "Empresa de Teste IA" }
    });
  }
  const companyId = company.id;
  console.log(`✅ Usando Empresa: ${company.name} (${companyId})`);

  // 2. Garantir que as regras de IA existam (Seed)
  console.log("📜 Configurando regras de IA...");
  
  // Regra 1: Queda de Faturamento Semanal
  await prisma.aIInsightRule.upsert({
    where: { code: 'REVENUE_DROP_WEEKLY' },
    update: { enabled: true },
    create: {
      code: 'REVENUE_DROP_WEEKLY',
      name: 'Queda de Faturamento Semanal',
      description: 'Detecta queda significativa no faturamento.',
      insightType: 'FINANCIAL_RISK',
      severityDefault: AIInsightSeverity.HIGH,
      conditionsJson: JSON.stringify({ threshold: 0.7 }),
      actionTemplate: 'Verificar pipeline de vendas.',
      enabled: true
    }
  });

  // Regra 2: Pico de Despesas
  await prisma.aIInsightRule.upsert({
    where: { code: 'EXPENSE_SPIKE' },
    update: { enabled: true },
    create: {
      code: 'EXPENSE_SPIKE',
      name: 'Pico de Despesas',
      description: 'Detecta despesas anormais no dia.',
      insightType: 'FINANCIAL_ALERT',
      severityDefault: AIInsightSeverity.MEDIUM,
      conditionsJson: JSON.stringify({ multiplier: 2.0 }),
      actionTemplate: 'Revisar lançamentos de hoje.',
      enabled: true
    }
  });

  console.log("✅ Regras configuradas (via Seed Catálogo).");

  // 3. Limpar dados anteriores (opcional, para teste limpo)
  // await prisma.transaction.deleteMany({ where: { description: { startsWith: "Teste IA" } } });

  // --- NOVO: Gerar Cenário de CHURN_RISK (Software) ---
  console.log("👥 Gerando Clientes e Títulos Vencidos (Cenário de Churn)...");
  
  // Limpar dados de teste anteriores de clientes/títulos se necessário
  // ...

  // Cliente 1: Risco Alto (3 títulos vencidos recentes)
  const customer1 = await prisma.customer.create({
    data: {
      companyId,
      name: "Cliente Em Risco Ltda " + Math.floor(Math.random() * 1000),
      document: "123456780001" + Math.floor(Math.random() * 99),
      email: "risco@cliente.com"
    }
  });

  // Títulos vencidos há 10, 20 e 40 dias
  for (const daysAgo of [10, 20, 40]) {
    await prisma.arTitle.create({
      data: {
        companyId,
        customerId: customer1.id,
        issueDate: subDays(new Date(), daysAgo + 30),
        dueDate: subDays(new Date(), daysAgo),
        amount: 1500.00,
        openAmount: 1500.00,
        status: "OVERDUE",
        documentNumber: `RISK-${daysAgo}`
      }
    });
  }

  // Cliente 2: Risco Médio (2 títulos vencidos)
  const customer2 = await prisma.customer.create({
    data: {
      companyId,
      name: "Cliente Alerta SA " + Math.floor(Math.random() * 1000),
      document: "987654320001" + Math.floor(Math.random() * 99),
      email: "alerta@cliente.com"
    }
  });

  for (const daysAgo of [5, 15]) {
    await prisma.arTitle.create({
      data: {
        companyId,
        customerId: customer2.id,
        issueDate: subDays(new Date(), daysAgo + 30),
        dueDate: subDays(new Date(), daysAgo),
        amount: 800.00,
        openAmount: 800.00,
        status: "OVERDUE",
        documentNumber: `ALERT-${daysAgo}`
      }
    });
  }
  console.log("✅ Dados de Churn gerados.");

  // 4. Gerar Dados Transacionais para os últimos 45 dias
  console.log("📊 Gerando transações históricas para análise...");
  
  // Vamos criar um cenário onde:
  // - A média de despesa é 200.
  // - Hoje (index 0) tem uma despesa de 5000 (Pico).
  
  for (let i = 0; i < 45; i++) {
    const date = subDays(new Date(), i);
    
    // Regra REVENUE_DROP_WEEKLY: Média de 1000, mas cai para 300 na última semana
    const revenueValue = i < 7 ? 300 : 1000;

    // Regra EXPENSE_SPIKE: Média de 200, mas hoje tem um pico de 5000
    const expenseValue = (i === 0) ? 5000 : 200;

    // Criar transação de receita
    await prisma.transaction.create({
      data: {
        companyId,
        date,
        description: `Teste IA - Receita D-${i}`,
        value: revenueValue,
        type: TransactionType.REVENUE,
        category: "Vendas",
        account: "Banco Central",
        status: TransactionStatus.APPROVED
      }
    });

    // Criar transação de despesa
    await prisma.transaction.create({
      data: {
        companyId,
        date,
        description: `Teste IA - Despesa D-${i}`,
        value: expenseValue,
        type: TransactionType.EXPENSE,
        category: "Operacional",
        account: "Banco Central",
        status: TransactionStatus.APPROVED
      }
    });
  }

  console.log(`✅ Transações geradas.`);

  // 5. Gerar Snapshots para o período (simulando o job diário)
  console.log("📸 Processando snapshots diários...");
  // Processamos de trás pra frente ou frente pra trás, tanto faz, o importante é ter o snapshot
  // Vamos processar apenas os últimos 30 dias para ser mais rápido
  for (let i = 0; i < 30; i++) {
    const date = subDays(new Date(), i);
    await insightsService.generateDailySnapshot(companyId, date);
  }
  console.log(`✅ Snapshots gerados.`);

  // 6. Executar o Motor de Insights (simulando o job de análise)
  console.log("🧠 Rodando Insight Engine...");
  const events = await insightsService.runInsightEngine(companyId);
  console.log(`✅ Processamento concluído. ${events.length} insights gerados.`);

  // 7. Exibir Resultados
  if (events.length > 0) {
    console.log("\n--- ÚLTIMOS INSIGHTS GERADOS ---");
    events.forEach(ins => {
      console.log(`[${ins.severity}] ${ins.title}`);
      console.log(`Resumo: ${ins.summary}`);
      console.log('---');
    });
  } else {
    console.log("⚠️ Nenhum insight foi gerado. Verifique se as regras foram atendidas.");
  }
}

main()
  .catch(e => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
