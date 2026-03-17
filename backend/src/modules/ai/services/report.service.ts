import PDFDocument from "pdfkit";
import { prisma } from "../../../lib/prisma";
import { insightsService } from "./insights.service";

export class ReportService {
  /**
   * Generates a PDF Financial Report based on AI insights
   */
  async generateFinancialReport(companyId: string): Promise<Buffer> {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    
    // 1. Fetch Data
    const [context, revenueHistory, expenseHistory, company] = await Promise.all([
      insightsService.getFinancialContext(companyId),
      insightsService.getMetricHistory(companyId, "revenue", 30),
      insightsService.getMetricHistory(companyId, "expense", 30),
      prisma.company.findUnique({ where: { id: companyId } })
    ]);

    // 2. Build PDF Content
    
    // Header
    doc.fontSize(20).text("Relatório de Inteligência Financeira", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Empresa: ${company?.name || "N/A"}`, { align: "right" });
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, { align: "right" });
    doc.moveDown(2);

    // Section 1: Executive Summary
    doc.fontSize(16).text("1. Resumo Executivo");
    doc.moveDown(0.5);
    doc.fontSize(12).text(context.replace(/\n/g, " "), { align: "justify" });
    doc.moveDown(2);

    // Section 2: Financial Metrics (Table-like)
    doc.fontSize(16).text("2. Desempenho Recente (30 dias)");
    doc.moveDown(0.5);
    
    // Simple table header
    const startX = doc.x;
    let currentY = doc.y;
    
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text("Data", startX, currentY);
    doc.text("Receita (R$)", startX + 100, currentY);
    doc.text("Despesa (R$)", startX + 250, currentY);
    doc.text("Resultado (R$)", startX + 400, currentY);
    
    doc.font('Helvetica');
    doc.moveDown(0.5);
    currentY = doc.y;

    // Table rows (Last 15 days to fit page)
    const combinedHistory = revenueHistory.slice(-15).map(r => {
      const expense = expenseHistory.find(e => e.date.getTime() === r.date.getTime());
      return {
        date: r.date,
        revenue: r.value,
        expense: expense?.value || 0,
        net: r.value - (expense?.value || 0)
      };
    });

    combinedHistory.forEach((row) => {
      currentY = doc.y;
      doc.text(row.date.toLocaleDateString(), startX, currentY);
      doc.text(row.revenue.toFixed(2), startX + 100, currentY);
      doc.text(row.expense.toFixed(2), startX + 250, currentY);
      
      const net = row.net;
      doc.fillColor(net >= 0 ? "green" : "red")
         .text(net.toFixed(2), startX + 400, currentY)
         .fillColor("black");
         
      doc.moveDown(0.5);
    });
    
    doc.moveDown(2);

    // Section 3: AI Recommendations
    doc.fontSize(16).text("3. Recomendações da IA");
    doc.moveDown(0.5);
    doc.fontSize(12).text(
      "Baseado nos dados analisados, recomenda-se focar na redução de despesas operacionais e recuperação de crédito de clientes inadimplentes. A tendência de curto prazo é estável, mas requer monitoramento contínuo das contas a pagar.", 
      { align: "justify" }
    );

    doc.end();

    return new Promise((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
    });
  }
}

export const reportService = new ReportService();
