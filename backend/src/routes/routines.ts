import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { resolveCompanyId } from "../lib/company.js";
import { RoutineType } from "@prisma/client";
import { sendToUser, sendMessage, sendMessageWithToken } from "../services/telegram.service.js";
import { generateSupportTicketsAIReport } from "../services/support-tickets-report.service.js";
import { env } from "../lib/env.js";

// ── schemas ───────────────────────────────────────────────────────────────────

const ListQuery = z.object({
  context: z.string().optional(),
});

const RoutineBodyBase = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(RoutineType),
  context: z.string().min(1),
  userId: z.string().optional().nullable(),
  recipientId: z.string().optional().nullable(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  dayOfMonth: z.number().int().min(0).max(31).nullable().optional(), // 0 = último dia do mês
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  departamentos: z.array(z.string()).default([]),
  active:        z.boolean().optional().default(true),
  previousDay:   z.boolean().optional().default(false),
});

const RoutineBody = RoutineBodyBase.refine(d => d.userId || d.recipientId, { message: "Informe userId ou recipientId" });

const routineSelect = {
  id: true,
  companyId: true,
  name: true,
  type: true,
  context: true,
  userId: true,
  user: { select: { id: true, name: true, email: true, telegramChatId: true } },
  recipientId: true,
  recipient: { select: { id: true, name: true, role: true, telegramChatId: true, email: true, whatsapp: true, usuAtend: true, departamentos: true, aiInstructions: true } },
  daysOfWeek: true,
  dayOfMonth: true,
  hour: true,
  minute: true,
  departamentos: true,
  active: true,
  previousDay: true,
  lastRunAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ── rotas ─────────────────────────────────────────────────────────────────────

export async function routinesRoutes(app: FastifyInstance) {
  // GET /routines — listar rotinas
  app.get(
    "/",
    { preHandler: [requireAuth(app)] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const { context } = ListQuery.parse(request.query);

      return prisma.routine.findMany({
        where: { companyId, ...(context ? { context } : {}) },
        select: routineSelect,
        orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      });
    }
  );

  // POST /routines — criar rotina
  app.post(
    "/",
    { preHandler: [requireAuth(app)] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const data = RoutineBody.parse(request.body);

      const routine = await prisma.routine.create({
        data: {
          companyId,
          name: data.name,
          type: data.type,
          context: data.context,
          userId: data.userId ?? null,
          recipientId: data.recipientId ?? null,
          daysOfWeek: data.daysOfWeek,
          dayOfMonth: data.dayOfMonth ?? null,
          hour: data.hour,
          minute: data.minute,
          departamentos: data.departamentos ?? [],
          active: data.active ?? true,
          previousDay: data.previousDay ?? false,
        },
        select: routineSelect,
      });

      reply.status(201);
      return routine;
    }
  );

  // PUT /routines/:id — atualizar rotina
  app.put(
    "/:id",
    { preHandler: [requireAuth(app)] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { id } = request.params as { id: string };
      const data = RoutineBodyBase.partial().parse(request.body);

      const existing = await prisma.routine.findFirst({ where: { id, companyId } });
      if (!existing) {
        reply.status(404);
        return { error: "NOT_FOUND" };
      }

      return prisma.routine.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.context !== undefined && { context: data.context }),
          ...(data.userId !== undefined && { userId: data.userId ?? null }),
          ...(data.recipientId !== undefined && { recipientId: data.recipientId ?? null }),
          ...(data.daysOfWeek !== undefined && { daysOfWeek: data.daysOfWeek }),
          ...(data.dayOfMonth !== undefined && { dayOfMonth: data.dayOfMonth }),
          ...(data.hour !== undefined && { hour: data.hour }),
          ...(data.minute !== undefined && { minute: data.minute }),
          ...(data.departamentos !== undefined && { departamentos: data.departamentos }),
          ...(data.active       !== undefined && { active:       data.active }),
          ...(data.previousDay  !== undefined && { previousDay:  data.previousDay }),
        },
        select: routineSelect,
      });
    }
  );

  // DELETE /routines/:id — excluir rotina
  app.delete(
    "/:id",
    { preHandler: [requireAuth(app)] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { id } = request.params as { id: string };

      const existing = await prisma.routine.findFirst({ where: { id, companyId } });
      if (!existing) {
        reply.status(404);
        return { error: "NOT_FOUND" };
      }

      await prisma.routine.delete({ where: { id } });
      return { ok: true };
    }
  );

  // POST /routines/:id/toggle — ativar/desativar
  app.post(
    "/:id/toggle",
    { preHandler: [requireAuth(app)] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { id } = request.params as { id: string };

      const existing = await prisma.routine.findFirst({ where: { id, companyId } });
      if (!existing) {
        reply.status(404);
        return { error: "NOT_FOUND" };
      }

      return prisma.routine.update({
        where: { id },
        data: { active: !existing.active },
        select: routineSelect,
      });
    }
  );

  // POST /routines/:id/run — executar manualmente com relatório real + link público
  app.post(
    "/:id/run",
    { preHandler: [requireAuth(app)] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { id } = request.params as { id: string };

      const routine = await prisma.routine.findFirst({
        where: { id, companyId },
        include: {
          user:      { select: { id: true, name: true, telegramChatId: true } },
          recipient: { select: { id: true, name: true, role: true, telegramChatId: true, usuAtend: true, departamentos: true, aiInstructions: true, telegramBot: { select: { token: true } } } },
        },
      });

      if (!routine) { reply.status(404); return { error: "NOT_FOUND" }; }

      // Resolve destinatário (novo ou legado)
      const chatId     = routine.recipient?.telegramChatId ?? routine.user?.telegramChatId ?? null;
      const recipName  = routine.recipient?.name ?? routine.user?.name ?? "GESTOR";
      const sendUserId = routine.userId ?? null;
      const role       = routine.recipient?.role ?? "SUPERVISOR";

      if (!chatId) { reply.status(400); return { error: "USER_NO_TELEGRAM" }; }

      const now  = new Date();
      const type = routine.type as "DAILY" | "WEEKLY" | "MONTHLY";

      // Período baseado no tipo (e em previousDay)
      const baseDate = routine.previousDay
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        : now;
      let dateTo: Date;
      const dateFrom = new Date(baseDate);
      if (type === "DAILY") {
        dateFrom.setHours(0, 0, 0, 0);
        dateTo = new Date(baseDate); dateTo.setHours(23, 59, 59, 999);
      } else if (type === "WEEKLY") {
        dateFrom.setDate(baseDate.getDate() - 6); dateFrom.setHours(0, 0, 0, 0);
        dateTo = new Date(baseDate); dateTo.setHours(23, 59, 59, 999);
      } else {
        // Mensal: mês completo do dia de referência
        dateFrom.setDate(1); dateFrom.setHours(0, 0, 0, 0);
        dateTo = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        dateTo.setHours(23, 59, 59, 999);
      }

      // Filtros por papel do destinatário
      // Prioridade: departamentos da rotina > departamentos do destinatário > todos
      const usuAtendFilter = role === "ATTENDANT" ? (routine.recipient?.usuAtend ?? undefined) : undefined;
      const departamentosFilter =
        (routine.departamentos?.length ?? 0) > 0
          ? routine.departamentos
          : role === "SUPERVISOR" && (routine.recipient?.departamentos?.length ?? 0) > 0
            ? routine.recipient!.departamentos
            : undefined;

      // Instruções de IA personalizadas do destinatário (substitui contexto global da equipe)
      const aiInstructions = routine.recipient?.aiInstructions ?? undefined;

      // Gera relatório real com IA
      let reportResult;
      try {
        if (routine.context === "supportTickets") {
          reportResult = await generateSupportTicketsAIReport(
            companyId, dateFrom, dateTo, type, recipName,
            usuAtendFilter, departamentosFilter, aiInstructions
          );
        }
      } catch { reportResult = null; }

      // Monta o link público
      let publicUrl: string | null = null;
      if (reportResult) {
        const token = nanoid(12);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await prisma.publicReport.create({
          data: {
            token, companyId,
            context: routine.context, type: routine.type,
            title: reportResult.title, content: reportResult.content,
            periodFrom: reportResult.periodFrom, periodTo: reportResult.periodTo,
            expiresAt,
            ...(reportResult.metricas ? { metricas: reportResult.metricas } : {}),
          },
        });
        const frontendUrl = (env.FRONTEND_ORIGIN ?? "http://localhost:5173").replace(/\/$/, "");
        publicUrl = `${frontendUrl}/r/${token}`;
      }

      const typeLabels:    Record<string, string> = { DAILY: "Diário", WEEKLY: "Semanal", MONTHLY: "Mensal" };
      const contextLabels: Record<string, string> = { supportTickets: "Atendimentos" };
      const typeLabel    = typeLabels[routine.type]    ?? routine.type;
      const contextLabel = contextLabels[routine.context] ?? routine.context;
      const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;

      const roleLabel = role === "ATTENDANT" ? "Desempenho Individual" : "Geral da Equipe";
      const msg = publicUrl
        ? `📊 <b>${routine.name}</b>\n\n` +
          `📅 ${fmtDate(dateFrom)} → ${fmtDate(dateTo)}\n\n` +
          `✅ Relatório gerado com sucesso!\n` +
          `🔗 <a href="${publicUrl}">Clique aqui para visualizar</a>\n\n` +
          `⏳ Link válido por 7 dias.`
        : `🔔 <b>Teste de Rotina</b>\n\n📋 <b>${routine.name}</b>\n🕐 ${now.toLocaleString("pt-BR")}\n\n✅ Rotina configurada corretamente.`;

      if (sendUserId) {
        await sendToUser(sendUserId, msg);
      } else if (routine.recipientId && chatId) {
        // Usa o bot configurado no destinatário, ou o bot padrão se não houver
        const botToken = routine.recipient?.telegramBot?.token;
        if (botToken) {
          await sendMessageWithToken(botToken, chatId, msg);
        } else {
          await sendMessage(chatId, msg);
        }
      }

      return { ok: true, publicUrl };
    }
  );
}
