import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { parseQuery } from "../../../lib/validation";
import { requireAuth, requireCompanyScope } from "../../../lib/auth";
import { PendencyStatus, TransactionType, UserRole } from "@prisma/client";
import { memoryController } from "../controllers/memory.controller";
import { indexingService } from "../services/indexing.service";
import { chatController } from "../controllers/chat.controller";
import { insightsController } from "../controllers/insights.controller";
import { taskController } from "../controllers/task.controller";
import { reportController } from "../controllers/report.controller";
import { notificationController } from "../controllers/notification.controller";
import { adminController } from "../controllers/admin.controller";
import { aiProfileController } from "../controllers/ai-profile.controller";

const HorizonQuery = z.object({
  horizon: z.enum(["30d", "90d", "12m"]).optional().default("30d"),
});

export async function aiModuleRoutes(app: FastifyInstance) {
  // Middleware global para todas as rotas de IA
  app.addHook("preHandler", requireAuth(app));
  app.addHook("preHandler", requireCompanyScope());

  // Rotas Admin (Protegidas)
  app.get("/admin/stats", adminController.getStats);
  app.get("/admin/jobs", adminController.listJobs);
  app.post("/admin/jobs/:id/retry", adminController.retryJob);
  app.get("/admin/calibration", adminController.getCalibrationStats);

  // Rotas de Perfil
  app.get("/profile", aiProfileController.getProfile);
  app.put("/profile", aiProfileController.updateProfile);
  app.post("/profile/test-connection", aiProfileController.testConnection);

  // Rotas de Memória
  app.post("/memories", memoryController.create);
  app.get("/memories", memoryController.list);
  app.get("/memories/search", memoryController.search);
  app.put("/memories/:id", memoryController.update);
  app.delete("/memories/:id", memoryController.delete);

  // Rotas de Chat
  app.post("/chat", chatController.create);
  app.get("/chat", chatController.list);
  app.get("/chat/:id", chatController.get);
  app.post("/chat/:id/message", chatController.sendMessage);

  // Rotas de Insights e Snapshots
  app.post("/insights/snapshot", insightsController.generateSnapshot);
  app.get("/insights/history", insightsController.getHistory);
  app.get("/insights/context", insightsController.getContext);
  app.post("/insights/analyze", insightsController.triggerAnalysis);
  app.get("/insights/events", insightsController.listEvents);
  app.post("/insights/:id/feedback", insightsController.saveFeedback);

  // Rotas de Relatórios (Fase 11 e Integração Executiva)
  app.get("/reports/financial", reportController.download);
  app.post("/reports/executive", reportController.generateExecutiveReport);
  app.post("/alerts", reportController.generateAlerts);

  // Rotas de Tarefas Autônomas (Fase 7)
  app.post("/tasks", taskController.create);
  app.get("/tasks", taskController.list); // Added list endpoint
  app.post("/tasks/worker/run", taskController.runWorker); // Debug only, should be protected or internal

  // Rotas de Notificações
  app.get("/notifications", notificationController.getMyNotifications);
  app.put("/notifications/:id/read", notificationController.markAsRead);
  app.put("/notifications/read-all", notificationController.markAllAsRead);
  
  app.get("/notifications/channels", notificationController.getMyChannels);
  app.post("/notifications/channels", notificationController.saveChannel);
  app.delete("/notifications/channels/:id", notificationController.deleteChannel);

  // Rota de Indexação (Admin ou Manual)
  app.post("/index-master-data", async (request, reply) => {
    const { companyId } = request.user as { companyId: string };
    const result = await indexingService.indexMasterData(companyId);
    return reply.send(result);
  });

  // Rotas de Insights e Métricas (Migradas de src/routes/ai.ts)
  app.get("/predictive-metrics", async (request) => {
    const { horizon } = parseQuery(HorizonQuery, request.query);
    const companyId = request.user.role === UserRole.ADMIN ? undefined : request.user.companyId!;

    const txs = await prisma.transaction.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { date: "desc" },
      take: 200,
    });

    const revenue = txs.filter((t) => t.type === TransactionType.REVENUE).reduce<number>((a, b) => a + b.value, 0);
    const expense = txs.filter((t) => t.type === TransactionType.EXPENSE).reduce<number>((a, b) => a + Math.abs(b.value), 0);
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
  });

  app.get("/insights", async (request: FastifyRequest) => {
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
          descricao:
            overdue > 0
              ? "Há itens vencidos que podem impactar fechamento e conciliação."
              : "Nenhuma pendência vencida no momento.",
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
  });
}
