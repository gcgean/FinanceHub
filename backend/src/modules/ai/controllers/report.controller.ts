import { FastifyReply, FastifyRequest } from "fastify";
import { reportService } from "../services/report.service";
import { insightsService } from "../services/insights.service";
import { ChatService } from "../services/chat.service";

const chatService = new ChatService();

export class ReportController {
  async download(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.user as { companyId: string };

    try {
      const buffer = await reportService.generateFinancialReport(companyId);

      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `attachment; filename="relatorio-financeiro-${Date.now()}.pdf"`);
      return reply.send(buffer);
    } catch (error: unknown) {
      console.error("Erro ao gerar relatório:", error);
      return reply.status(500).send({ error: "Falha ao gerar relatório PDF" });
    }
  }

  async generateExecutiveReport(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.user as { companyId: string };

    try {
      const dadosCliente = await insightsService.getDetailedCompanyData(companyId);
      
      const prompt = `Com base nos dados abaixo, gere um relatório executivo completo no seguinte formato:

📊 RELATÓRIO EXECUTIVO — ${dadosCliente?.nome || 'FinanceHub'}

1. RESUMO DO PERÍODO
2. DESEMPENHO DE FATURAMENTO (com % em relação à meta)
3. INDICADORES-CHAVE
4. ⚠️ ALERTAS E RISCOS
5. 💡 RECOMENDAÇÕES ESTRATÉGICAS (mínimo 3)
6. PRÓXIMOS PASSOS SUGERIDOS

IMPORTANTE: Você está gerando o relatório para a empresa "${dadosCliente?.nome || 'FinanceHub'}". Os dados abaixo são dela.

Dados: ${JSON.stringify(dadosCliente, null, 2)}`;

      // Reutiliza o provider configurado para a empresa (Sonnet 4.6, OpenAI, etc)
      // Usando cast para acessar o método privado ou usar o service. (Vou alterar para public ou expor método de prompt raw)
      const provider = await (chatService as any).getProvider(companyId);
      
      const resposta = await provider.generateResponse([{ role: "user", content: prompt }]);
      
      return reply.send({ relatorio: resposta.content });
    } catch (error: unknown) {
      console.error("Erro ao gerar relatório executivo:", error);
      return reply.status(500).send({ error: "Falha ao gerar relatório" });
    }
  }

  async generateAlerts(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.user as { companyId: string };

    try {
      const dadosCliente = await insightsService.getDetailedCompanyData(companyId);
      
      const prompt = `Analise os dados abaixo e identifique alertas críticos que o gestor precisa saber.
Para cada alerta, classifique como: 🔴 CRÍTICO, 🟡 ATENÇÃO ou 🟢 POSITIVO.
Seja conciso (máximo 2 linhas por alerta).

Dados: ${JSON.stringify(dadosCliente, null, 2)}`;

      const provider = await (chatService as any).getProvider(companyId);
      const resposta = await provider.generateResponse([{ role: "user", content: prompt }]);
      
      return reply.send({ alertas: resposta.content });
    } catch (error: unknown) {
      console.error("Erro ao gerar alertas:", error);
      return reply.status(500).send({ error: "Falha ao gerar alertas" });
    }
  }
}

export const reportController = new ReportController();
