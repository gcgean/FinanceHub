import cron from "node-cron";
import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma.js";
import { sendToUser, sendMessage } from "./telegram.service.js";
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

  // Busca todas as rotinas ativas com o horário atual (inclui user e recipient)
  const routines = await prisma.routine.findMany({
    where: { active: true, hour: currentHour, minute: currentMinute },
    include: {
      user:      { select: { id: true, name: true, telegramChatId: true } },
      recipient: { select: { id: true, name: true, role: true, telegramChatId: true, usuAtend: true, departamentos: true, aiInstructions: true } },
    },
  });

  if (routines.length === 0) return;

  // Filtra apenas as rotinas que devem disparar agora
  const dueRoutines = routines.filter(r => shouldRun(r, now));
  if (dueRoutines.length === 0) return;

  console.log(`[RoutineScheduler] ${dueRoutines.length} rotina(s) para disparar às ${zeroPad(currentHour)}:${zeroPad(currentMinute)}`);

  const typeLabels:    Record<string, string> = { DAILY: "Diário", WEEKLY: "Semanal", MONTHLY: "Mensal" };
  const contextLabels: Record<string, string> = { supportTickets: "Atendimentos" };

  // ── Processa cada rotina individualmente ──────────────────────────────────
  // (cada destinatário pode ter filtros próprios — não é possível deduplicar)
  for (const routine of dueRoutines) {
    try {
      const routineType = routine.type as "DAILY" | "WEEKLY" | "MONTHLY";

      // Resolve destinatário e chatId
      const chatId    = routine.recipient?.telegramChatId ?? routine.user?.telegramChatId ?? null;
      const recipName = routine.recipient?.name ?? routine.user?.name ?? "GESTOR";
      const role      = routine.recipient?.role ?? "SUPERVISOR";

      if (!chatId) {
        console.warn(`[RoutineScheduler] Rotina ${routine.id} (${routine.name}): destinatário sem Telegram. Pulando envio.`);
        await prisma.routine.update({ where: { id: routine.id }, data: { lastRunAt: now } });
        continue;
      }

      // Filtros por papel do destinatário
      const usuAtendFilter = role === "ATTENDANT"
        ? (routine.recipient?.usuAtend ?? undefined)
        : undefined;
      const departamentosFilter = role === "SUPERVISOR" && (routine.recipient?.departamentos?.length ?? 0) > 0
        ? routine.recipient!.departamentos
        : undefined;

      // Instruções de IA personalizadas do destinatário (substitui contexto global da equipe)
      const aiInstructions = routine.recipient?.aiInstructions ?? undefined;

      console.log(`[RoutineScheduler] Gerando relatório para "${recipName}" (rotina: ${routine.name})...`);

      // Gera relatório com filtros individuais
      let reportResult;
      try {
        if (routine.context === "supportTickets") {
          const { dateFrom, dateTo } = getPeriod(routineType, now);
          reportResult = await generateSupportTicketsAIReport(
            routine.companyId, dateFrom, dateTo, routineType, recipName,
            usuAtendFilter, departamentosFilter, aiInstructions
          );
        } else {
          reportResult = await generateReportForContext(
            routine.context, routine.companyId, routineType, now, recipName
          );
        }
      } catch (reportErr) {
        console.error(`[RoutineScheduler] ❌ Erro ao gerar relatório para ${recipName}:`, reportErr);
        await prisma.routine.update({ where: { id: routine.id }, data: { lastRunAt: now } });
        continue;
      }

      // Cria link público
      const publicUrl = await createPublicReport(
        routine.companyId, routine.context, routine.type,
        reportResult.title, reportResult.content,
        reportResult.periodFrom, reportResult.periodTo
      );

      const contextLabel = contextLabels[routine.context] ?? routine.context;
      const typeLabel    = typeLabels[routine.type] ?? routine.type;
      const roleLabel    = role === "ATTENDANT" ? "Desempenho Individual" : "Geral da Equipe";

      const msg =
        `📊 <b>Relatório ${typeLabel} de ${contextLabel} (${roleLabel})</b>\n\n` +
        `📅 ${fmtDate(reportResult.periodFrom)} → ${fmtDate(reportResult.periodTo)}\n\n` +
        `✅ Seu relatório está pronto!\n` +
        `🔗 <a href="${publicUrl}">Clique aqui para visualizar</a>\n\n` +
        `⏳ Link disponível por 7 dias.`;

      // Envia mensagem
      let sent = false;
      if (routine.userId) {
        sent = await sendToUser(routine.userId, msg);
      } else {
        sent = await sendMessage(chatId, msg);
      }

      if (sent) {
        console.log(`[RoutineScheduler] ✅ Enviado para ${recipName} (chatId=${chatId}) — link: ${publicUrl}`);
      } else {
        console.error(`[RoutineScheduler] ❌ Falha ao enviar para ${recipName} (chatId=${chatId}). Verifique se o usuário iniciou conversa com o bot.`);
      }
      await prisma.routine.update({ where: { id: routine.id }, data: { lastRunAt: now } });

    } catch (err) {
      console.error(`[RoutineScheduler] ❌ Erro na rotina ${routine.id} (${routine.name}):`, err);
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
