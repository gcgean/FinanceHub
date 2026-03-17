import { prisma } from "../src/lib/prisma.ts";

async function verifyAIModule() {
  console.log("🔍 Verificando Módulo de IA...\n");

  try {
    // 1. Verificar conexão com DB
    await prisma.$connect();
    console.log("✅ Banco de Dados: Conectado");

    // 2. Verificar Tabelas
    const tables = [
      "AIProfile",
      "AISector",
      "AIMemory",
      "AIDocument",
      "AIChat",
      "AIMessage",
      "AIMetricSnapshot",
      "AITask"
    ];

    console.log("\n📋 Verificando Tabelas:");
    // Simple check by trying to count (will fail if table doesn't exist in Prisma Client)
    await prisma.aIProfile.count();
    console.log("- AIProfile: OK");
    await prisma.aISector.count();
    console.log("- AISector: OK");
    await prisma.aIMemory.count();
    console.log("- AIMemory: OK");
    await prisma.aIDocument.count();
    console.log("- AIDocument: OK");
    await prisma.aIChat.count();
    console.log("- AIChat: OK");
    await prisma.aIMessage.count();
    console.log("- AIMessage: OK");
    await prisma.aIMetricSnapshot.count();
    console.log("- AIMetricSnapshot: OK");
    await prisma.aITask.count();
    console.log("- AITask: OK");

    console.log("\n🎉 Módulo de IA verificado com sucesso!");
  } catch (error) {
    console.error("\n❌ Erro na verificação:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAIModule();
