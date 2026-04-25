import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { resolveCompanyId } from "../lib/company";
import { RoutineType } from "@prisma/client";
import { sendToUser } from "../services/telegram.service";
import { generateSupportTicketsAIReport } from "../services/support-tickets-report.service";
import { env } from "../lib/env";

// ── schemas ───────────────────────────────────────────────────────────────────

const ListQuery = z.object({
  context: z.string().optional(),
});

const RoutineBody = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(RoutineType),
  context: z.string().min(1),
  userId: z.string().min(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  active: z.boolean().optional().default(true),
});

const routineSelect = {
  id: true,
  companyId: true,
  name: true,
  type: true,
  context: true,
  userId: true,
  user: { select: { id: true, name: true, email: true, telegramChatId: true } },
  daysOfWeek: true,
  dayOfMonth: true,
  hour: true,
  minute: true,
  active: true,
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
          userId: data.userId,
          daysOfWeek: data.daysOfWeek,
          dayOfMonth: data.dayOfMonth ?? null,
          hour: data.hour,
          minute: data.minute,
          active: data.active ?? true,
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
      const data = RoutineBody.partial().parse(request.body);

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
          ...(data.userId !== undefined && { userId: data.userId }),
          ...(data.daysOfWeek !== undefined && { daysOfWeek: data.daysOfWeek }),
          ...(data.dayOfMonth !== undefined && { dayOfMonth: data.dayOfMonth }),
          ...(data.hour !== undefined && { hour: data.hour }),
          ...(data.minute !== undefined && { minute: data.minute }),
          ...(data.active !== undefined && { active: data.active }),
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
        include: { user: { select: { id: true, name: true, telegramChatId: true } } },
      });

      if (!routine) {
        reply.status(404);
        return { error: "NOT_FOUND" };
      }

      if (!routine.user.telegramChatId) {
        reply.status(400);
        return { error: "USER_NO_TELEGRAM" };
      }

      const now = new Date();
      const type = routine.type as "DAILY" | "WEEKLY" | "MONTHLY";

      // Período baseado no tipo
      const dateTo = new Date(now);
      dateTo.setHours(23, 59, 59, 999);
      const dateFrom = new Date(now);
      if (type === "DAILY") {
        dateFrom.setHours(0, 0, 0, 0);
      } else if (type === "WEEKLY") {
        dateFrom.setDate(now.getDate() - 6);
        dateFrom.setHours(0, 0, 0, 0);
      } else {
        dateFrom.setDate(1);
        dateFrom.setHours(0, 0, 0, 0);
      }

      // Gera relatório real com IA
      let reportResult;
      try {
        if (routine.context === "supportTickets") {
          reportResult = await generateSupportTicketsAIReport(companyId, dateFrom, dateTo, type, routine.user.name ?? "GESTOR");
        }
      } catch {
        reportResult = null;
      }

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
          },
        });
        const frontendUrl = (env.FRONTEND_ORIGIN ?? "http://localhost:5173").replace(/\/$/, "");
        publicUrl = `${frontendUrl}/r/${token}`;
      }

      const typeLabels: Record<string, string> = { DAILY: "Diário", WEEKLY: "Semanal", MONTHLY: "Mensal" };
      const contextLabels: Record<string, string> = { supportTickets: "Atendimentos" };
      const typeLabel = typeLabels[routine.type] ?? routine.type;
      const contextLabel = contextLabels[routine.context] ?? routine.context;
      const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;

      const msg = publicUrl
        ? `📊 <b>Teste — Relatório ${typeLabel} de ${contextLabel}</b>\n\n` +
          `📅 ${fmtDate(dateFrom)} → ${fmtDate(dateTo)}\n\n` +
          `✅ Relatório gerado com sucesso!\n` +
          `🔗 <a href="${publicUrl}">Clique aqui para visualizar</a>\n\n` +
          `⏳ Link válido por 7 dias.`
        : `🔔 <b>Teste de Rotina</b>\n\n📋 <b>${routine.name}</b>\n🕐 ${now.toLocaleString("pt-BR")}\n\n✅ Rotina configurada corretamente.`;

      await sendToUser(routine.userId, msg);
      return { ok: true, publicUrl };
    }
  );
}
