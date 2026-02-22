import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, requireCompanyScope } from "../lib/auth";
import { resolveCompanyId } from "../lib/company";
import { UserRole } from "@prisma/client";

export async function reportsExportRoutes(app: FastifyInstance) {
  app.get(
    "/xlsx",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request, reply) => {
      const Query = z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        accountId: z.string().optional(),
      });
      const q = Query.parse(request.query);
      const companyId = await resolveCompanyId(request);

      const account = q.accountId ? await prisma.account.findUnique({ where: { id: q.accountId } }) : null;
      const txWhere = {
        companyId,
        ...(q.dateFrom || q.dateTo
          ? {
              date: {
                ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
                ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
              },
            }
          : {}),
        ...(account ? { account: account.description } : {}),
      };
      const txs = await prisma.transaction.findMany({
        where: txWhere,
        orderBy: { date: "asc" },
        select: { date: true, description: true, category: true, account: true, value: true, status: true },
      });

      const ledgerWhere = {
        companyId,
        ...(q.dateFrom || q.dateTo
          ? {
              issueDate: {
                ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
                ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
              },
            }
          : {}),
        ...(q.accountId ? { accountId: q.accountId } : {}),
      };
      const ledger = await prisma.bankLedgerEntry.findMany({
        where: ledgerWhere,
        orderBy: { issueDate: "asc" },
        select: {
          issueDate: true,
          operation: true,
          amount: true,
          history: true,
          account: { select: { description: true } },
          confirmed: true,
        },
      });

      const dreLines = await prisma.chartAccount.findMany({
        where: { companyId },
        select: { code: true, description: true, revenueExpense: true },
      });
      const dreRows = dreLines.map((l) => [l.code, l.description, "GROUP", 0, 0, l.revenueExpense]);

      const wb = XLSX.utils.book_new();
      const txHeaders = ["Data", "Descrição", "Categoria", "Conta", "Valor", "Status"];
      const txRows = txs.map((t) => [
        new Date(t.date),
        t.description,
        t.category,
        t.account,
        t.value,
        t.status,
      ]);
      const txSheet = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
      for (let r = 1; r <= txRows.length; r++) {
        const dCell = XLSX.utils.encode_cell({ r, c: 0 });
        const vCell = XLSX.utils.encode_cell({ r, c: 4 });
        if (txSheet[dCell]) { txSheet[dCell].t = "d"; txSheet[dCell].z = "yyyy-mm-dd"; }
        if (txSheet[vCell]) { txSheet[vCell].z = '[$R$-pt-BR] #,##0.00'; }
      }
      XLSX.utils.book_append_sheet(wb, txSheet, "Transacoes");

      const stHeaders = ["Data", "Operação", "Valor", "Histórico", "Conta", "Confirmado"];
      const stRows = ledger.map((i) => [
        new Date(i.issueDate),
        i.operation,
        i.amount,
        i.history ?? "",
        i.account?.description ?? "",
        i.confirmed ? "Sim" : "Não",
      ]);
      const stSheet = XLSX.utils.aoa_to_sheet([stHeaders, ...stRows]);
      for (let r = 1; r <= stRows.length; r++) {
        const dCell = XLSX.utils.encode_cell({ r, c: 0 });
        const vCell = XLSX.utils.encode_cell({ r, c: 2 });
        if (stSheet[dCell]) { stSheet[dCell].t = "d"; stSheet[dCell].z = "yyyy-mm-dd"; }
        if (stSheet[vCell]) { stSheet[vCell].z = '[$R$-pt-BR] #,##0.00'; }
      }
      XLSX.utils.book_append_sheet(wb, stSheet, "Extrato");

      const dreHeaders = ["Código", "Descrição", "Tipo", "Valor", "Total", "RE"];
      const dreSheet = XLSX.utils.aoa_to_sheet([dreHeaders, ...dreRows]);
      XLSX.utils.book_append_sheet(wb, dreSheet, "DRE");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
      reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      reply.header("Content-Disposition", "attachment; filename=financehub.xlsx");
      return reply.send(wbout);
    }
  );
}
