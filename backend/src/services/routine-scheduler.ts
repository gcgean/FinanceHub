import cron from "node-cron";
import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma.js";
import { sendToUser } from "./telegram.service.js";
import { generateSupportTicketsAIReport } from "./support-tickets-report.service.js";
import { env } from "../lib/env.js";

// ── helpers ───────────────────────────────────────────────────────────────────

function zeroPad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtDate(d: Date) {
  return `${zeroPad(d.getDate())}/${zeroPad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function alreadyRanToday(lastRunAt: Date | null, now: Date): boolean {
  if (!lastRunAt) return false;
  return lastRunAt.getFullYear() === now.getFullYear() &&
    lastRunAt.getMonth() === now.getMonth() &&
    lastRunAt.getDate() === now.getDate();
}

function alreadyRanThisWeek(lastRunAt: Date | null, now: Date): boolean {
  if (!lastRunAt) return false;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return lastRunAt >= startOfWeek;
}

function alreadyRanThisMonth(lastRunAt: Date | null, now: Date): boolean {
  if (!lastRunAt) return false;
  return lastRunAt.getFullYear() === now.getFullYear() && lastRunAt.getMonth() === now.getMonth();
}

function shouldRun(routine: { type: string; daysOfWeek: number[]; dayOfMonth: number | null; lastRunAt: Date | null }, now: Date): boolean {
  const currentDayOfWeek = now.getDay();
  const currentDayOfMonth = now.getDate();

  if (routine.type === "DAILY") {
    if (alreadyRanToday(routine.lastRunAt, now)) return false;
    return routine.daysOfWeek.includes(currentDayOfWeek);
  }
  if (routine.type === "WEEKLY") {
    if (alreadyRanThisWeek(routine.lastRunAt, now)) return false;
    return routine.daysOfWeek.includes(currentDayOfWeek);
  }
  if (routine.type === "MONTHLY") {
    if (alreadyRanThisMonth(routine.lastRunAt, now)) return false;
    return currentDayOfMonth === routine.dayOfMonth;
  }
  return false;
}

function getFrontendUrl(): string {
  const url = env.FRONTEND_ORIGIN ?? "http://localhost:5173";
  return url.replace(/\/$/, "");
}

// ── cálculo do período do relatório ──────────────────────────────────────────

function getPeriod(type: "DAILY" | "WEEKLY" | "MONTHLY", now: Date): { dateFrom: Date; dateTo: Date } {
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
  return { dateFrom, dateTo };
}

// ── geração de conteúdo por contexto ─────────────────────────────────────────

async function generateReportForContext(
  context: string,
  companyId: string,
  type: "DAILY" | "WEEKLY" | "MONTHLY",
  now: Date,
  recipientName: string
) {
  if (context === "supportTickets") {
    const { dateFrom, dateTo } = getPeriod(type, now);
    return generateSupportTicketsAIReport(companyId, dateFrom, dateTo, type, recipientName);
  }
  // Fallback genérico (para outros contextos futuros)
  const fmtD = fmtDate(now);
  const labels: Record<string, string> = { DAILY: "Diário", WEEKLY: "Semanal", MONTHLY: "Mensal" };
  return {
    content: `📢 Relatório ${labels[type] ?? type} de <b>${context}</b> — ${fmtD}`,
    title: `Relatório ${labels[type]} — ${fmtD}`,
    periodFrom: now,
    periodTo: now,
  };
}

// ── criação do link público ───────────────────────────────────────────────────

async function createPublicReport(
  companyId: string,
  context: string,
  type: string,
  title: string,
  content: string,
  periodFrom: Date,
  periodTo: Date
): Promise<string> {
  const token = nanoid(12); // token URL-safe de 12 chars
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // expira em 7 dias

  await prisma.publicReport.create({
    data: { token, companyId, context, type, title, content, periodFrom, periodTo, expiresAt },
  });

  return `${getFrontendUrl()}/r/${token}`;
}

// ── processamento principal ───────────────────────────────────────────────────

async function processRoutines() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Busca todas as rotinas ativas com o horário atual
  const routines = await prisma.routine.findMany({
    where: { active: true, hour: currentHour, minute: currentMinute },
    include: { user: { select: { id: true, name: true, telegramChatId: true } } },
  });

  if (routines.length === 0) return;

  // Filtra apenas as rotinas que devem disparar agora
  const dueRoutines = routines.filter(r => shouldRun(r, now));
  if (dueRoutines.length === 0) return;

  console.log(`[RoutineScheduler] ${dueRoutines.length} rotina(s) para disparar às ${zeroPad(currentHour)}:${zeroPad(currentMinute)}`);

  // ── DEDUPLICAÇÃO ──────────────────────────────────────────────────────────
  // Agrupa por { companyId + context + type } — mesmo relatório, múltiplos destinatários
  type GroupKey = string;
  type RoutineGroup = {
    companyId: string;
    context: string;
    type: "DAILY" | "WEEKLY" | "MONTHLY";
    routines: typeof dueRoutines;
  };

  const groups = new Map<GroupKey, RoutineGroup>();

  for (const routine of dueRoutines) {
    const key = `${routine.companyId}::${routine.context}::${routine.type}`;
    if (!groups.has(key)) {
      groups.set(key, {
        companyId: routine.companyId,
        context: routine.context,
        type: routine.type as "DAILY" | "WEEKLY" | "MONTHLY",
        routines: [],
      });
    }
    groups.get(key)!.routines.push(routine);
  }

  // ── PROCESSAMENTO POR GRUPO ────────────────────────────────────────────────
  for (const [key, group] of groups) {
    try {
      // Usa o nome do primeiro destinatário com Telegram para gerar o relatório
      const firstWithTelegram = group.routines.find(r => r.user.telegramChatId);
      if (!firstWithTelegram) {
        console.warn(`[RoutineScheduler] Grupo ${key}: nenhum destinatário com Telegram. Pulando.`);
        // Atualiza lastRunAt mesmo assim para não tentar de novo
        for (const r of group.routines) {
          await prisma.routine.update({ where: { id: r.id }, data: { lastRunAt: now } });
        }
        continue;
      }

      const recipientName = firstWithTelegram.user.name ?? "GESTOR";

      console.log(`[RoutineScheduler] Gerando relatório IA para grupo ${key} (${group.routines.length} destinatário(s))...`);

      // ── Gera o relatório UMA ÚNICA VEZ para todo o grupo ──
      const reportResult = await generateReportForContext(
        group.context,
        group.companyId,
        group.type,
        now,
        recipientName
      );

      // ── Cria o link público ──
      const publicUrl = await createPublicReport(
        group.companyId,
        group.context,
        group.type,
        reportResult.title,
        reportResult.content,
        reportResult.periodFrom,
        reportResult.periodTo
      );

      const typeLabels: Record<string, string> = { DAILY: "Diário", WEEKLY: "Semanal", MONTHLY: "Mensal" };
      const contextLabels: Record<string, string> = { supportTickets: "Atendimentos" };
      const contextLabel = contextLabels[group.context] ?? group.context;
      const typeLabel = typeLabels[group.type] ?? group.type;

      // ── Envia para CADA destinatário do grupo ──
      for (const routine of group.routines) {
        try {
          if (!routine.user.telegramChatId) {
            console.warn(`[RoutineScheduler] Usuário ${routine.user.id} sem Telegram. Rotina: ${routine.name}`);
          } else {
            const msg =
              `📊 <b>Relatório ${typeLabel} de ${contextLabel}</b>\n\n` +
              `📅 ${fmtDate(reportResult.periodFrom)} → ${fmtDate(reportResult.periodTo)}\n\n` +
              `✅ Seu relatório está pronto!\n` +
              `🔗 <a href="${publicUrl}">Clique aqui para visualizar</a>\n\n` +
              `⏳ Link disponível por 7 dias.`;

            await sendToUser(routine.userId, msg);
            console.log(`[RoutineScheduler] ✅ Enviado para ${routine.user.name ?? routine.userId}`);
          }

          // Atualiza lastRunAt independentemente de ter Telegram
          await prisma.routine.update({ where: { id: routine.id }, data: { lastRunAt: now } });
        } catch (err) {
          console.error(`[RoutineScheduler] ❌ Erro ao enviar para ${routine.user.id}:`, err);
        }
      }

      console.log(`[RoutineScheduler] ✅ Grupo ${key} concluído — link: ${publicUrl}`);
    } catch (err) {
      console.error(`[RoutineScheduler] ❌ Erro no grupo ${key}:`, err);
    }
  }
}

// ── inicialização ─────────────────────────────────────────────────────────────

export function startRoutineScheduler() {
  cron.schedule("* * * * *", () => {
    processRoutines().catch(err =>
      console.error("[RoutineScheduler] Erro:", err)
    );
  });
  console.log("[RoutineScheduler] Iniciado — verificação a cada minuto.");
}
