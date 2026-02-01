import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseQuery } from "../lib/validation";
import { requireAuth, requireCompanyScope } from "../lib/auth";
import { PendencyStatus, TransactionType, UserRole } from "@prisma/client";

const HorizonQuery = z.object({
  horizon: z.enum(["30d", "90d", "12m"]).optional().default("30d"),
});

export async function aiRoutes(app: FastifyInstance) {
  app.get(
    "/predictive-metrics",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { horizon } = parseQuery(HorizonQuery, request.query);
      const companyId = request.user.role === UserRole.ADMIN ? undefined : request.user.companyId!;

      const txs = await prisma.transaction.findMany({ where: companyId ? { companyId } : undefined, orderBy: { date: "desc" }, take: 200 });

      const revenue = txs.filter((t) => t.type === TransactionType.REVENUE).reduce((a, b) => a + b.value, 0);
      const expense = txs.filter((t) => t.type === TransactionType.EXPENSE).reduce((a, b) => a + Math.abs(b.value), 0);
      const net = revenue - expense;

      const factor = horizon === "30d" ? 1.03 : horizon === "90d" ? 1.08 : 1.2;

      return {
        horizon,
        metrics: [
          {
            label: "Receita",
            valorAtual: Math.round(revenue),
            valorPrevisto: Math.round(revenue * factor),
            tendencia: "up",
            confianca: 72,
          },
          {
            label: "Despesas",
            valorAtual: Math.round(expense),
            valorPrevisto: Math.round(expense * (factor - 0.01)),
            tendencia: "stable",
            confianca: 68,
          },
          {
            label: "Resultado",
            valorAtual: Math.round(net),
            valorPrevisto: Math.round(net * factor),
            tendencia: net >= 0 ? "up" : "down",
            confianca: 64,
          },
        ],
      };
    }
  );

  app.get(
    "/insights",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = request.user.role === UserRole.ADMIN ? undefined : request.user.companyId!;


      const [overdue, pending] = await Promise.all([
        prisma.pendency.count({ where: { ...(companyId ? { companyId } : {}), status: PendencyStatus.OVERDUE } }),
        prisma.pendency.count({ where: { ...(companyId ? { companyId } : {}), status: PendencyStatus.PENDING } }),
      ]);

      return {
        generatedAt: new Date().toISOString(),
        insights: [
          {
            id: "i_overdue",
            tipo: "alerta",
            titulo: `Pendências atrasadas: ${overdue}`,
            descricao: overdue > 0 ? "Há itens vencidos que podem impactar fechamento e conciliação." : "Nenhuma pendência vencida no momento.",
            impacto: overdue > 0 ? -overdue * 1000 : 0,
            confianca: 70,
            categoria: "Operação",
          },
          {
            id: "i_pending",
            tipo: "tendencia",
            titulo: `Pendências pendentes: ${pending}`,
            descricao: "Fila atual de itens aguardando ação do cliente ou operador.",
            impacto: pending > 0 ? -pending * 250 : 0,
            confianca: 65,
            categoria: "Operação",
          },
        ],
      };
    }
  );
}
