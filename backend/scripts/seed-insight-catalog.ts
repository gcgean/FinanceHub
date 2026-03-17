import { PrismaClient } from "@prisma/client";
import { insightEngineRegistry } from "../src/modules/ai/engine/registry";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do Catálogo de Insights...");
  
  const analyzers = insightEngineRegistry.getAllAnalyzers();
  
  for (const analyzer of analyzers) {
    console.log(`Processando regra: ${analyzer.code}`);
    
    // Verificar se existe globalmente (companyId: null) ou criar
    // Aqui assumimos que são regras globais do sistema
    
    await prisma.aIInsightRule.upsert({
      where: { code: analyzer.code },
      update: {
        name: analyzer.name,
        description: analyzer.description,
        insightType: analyzer.insightType,
        severityDefault: analyzer.severityDefault,
        // segment: analyzer.segment, // Não tem campo segment ainda na tabela Rule
        conditionsJson: JSON.stringify({ segment: analyzer.segment }),
        enabled: true
      },
      create: {
        code: analyzer.code,
        name: analyzer.name,
        description: analyzer.description,
        insightType: analyzer.insightType,
        severityDefault: analyzer.severityDefault,
        conditionsJson: JSON.stringify({ segment: analyzer.segment }),
        enabled: true,
        companyId: null, // Regra global
      }
    });
  }
  
  console.log("Seed concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
