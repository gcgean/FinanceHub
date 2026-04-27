import { prisma } from "../../../lib/prisma.js";
import { memoryService } from "./memory.service.js";

export class IndexingService {
  /**
   * Indexa clientes e fornecedores como memórias textuais para RAG.
   * Deve ser executado periodicamente ou sob demanda.
   */
  async indexMasterData(companyId: string) {
    const results = {
      customers: 0,
      suppliers: 0,
      errors: 0,
    };

    // 1. Indexar Clientes
    try {
      const customers = await prisma.customer.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true, document: true, city: true, state: true, classification: { select: { name: true } } },
      });

      for (const customer of customers) {
        const content = `Cliente: ${customer.name}. Documento: ${customer.document || "N/A"}. Localização: ${customer.city}/${customer.state}. Classificação: ${customer.classification?.name || "Padrão"}.`;
        
        // Verifica se já existe memória similar (simplificado)
        // Idealmente usaria hash, mas aqui vamos confiar na busca ou recriação
        // Para evitar duplicatas infinitas, vamos deletar memórias antigas desse tipo ou usar uma chave única.
        // Como não temos chave única na memória ligada à entidade, vamos apenas adicionar.
        // Melhoria futura: Adicionar entityId na AIMemory.
        
        await memoryService.createMemory(companyId, {
          content,
          tags: ["customer", "master-data", `customer:${customer.id}`],
          confidence: 1.0,
        });
        results.customers++;
      }
    } catch (error) {
      console.error("Erro ao indexar clientes:", error);
      results.errors++;
    }

    // 2. Indexar Fornecedores
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true, document: true, city: true, state: true },
      });

      for (const supplier of suppliers) {
        const content = `Fornecedor: ${supplier.name}. Documento: ${supplier.document || "N/A"}. Localização: ${supplier.city}/${supplier.state}.`;
        
        await memoryService.createMemory(companyId, {
          content,
          tags: ["supplier", "master-data", `supplier:${supplier.id}`],
          confidence: 1.0,
        });
        results.suppliers++;
      }
    } catch (error) {
      console.error("Erro ao indexar fornecedores:", error);
      results.errors++;
    }

    return results;
  }
}

export const indexingService = new IndexingService();
