import { FastifyReply, FastifyRequest } from "fastify";
import { reportService } from "../services/report.service";

export class ReportController {
  async download(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.user as any as { companyId: string };

    try {
      const buffer = await reportService.generateFinancialReport(companyId);

      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `attachment; filename="relatorio-financeiro-${Date.now()}.pdf"`);
      return reply.send(buffer);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      return reply.status(500).send({ error: "Falha ao gerar relatório PDF" });
    }
  }
}

export const reportController = new ReportController();
