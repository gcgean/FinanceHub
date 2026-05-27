import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { resolveCompanyId } from "../lib/company.js";
import { sendMessageWithToken } from "../services/telegram.service.js";

const BotBody = z.object({
  name:     z.string().min(1),                   // nome amigável
  username: z.string().optional().nullable(),    // username sem @
  token:    z.string().min(10),                  // token do BotFather
  active:   z.boolean().optional().default(true),
});

const BotUpdateBody = z.object({
  name:     z.string().min(1).optional(),
  username: z.string().optional().nullable(),
  token:    z.string().min(10).optional(),       // opcional: só atualiza se enviado
  active:   z.boolean().optional(),
});

// Campos retornados — token mascarado: apenas os últimos 6 caracteres visíveis
function maskToken(token: string): string {
  if (token.length <= 6) return "***";
  return `${"•".repeat(token.length - 6)}${token.slice(-6)}`;
}

function botView(bot: { id: string; companyId: string; name: string; username: string | null; token: string; active: boolean; createdAt: Date; updatedAt: Date }) {
  return {
    id:        bot.id,
    companyId: bot.companyId,
    name:      bot.name,
    username:  bot.username,
    tokenMask: maskToken(bot.token),
    active:    bot.active,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
  };
}

export async function telegramBotsRoutes(app: FastifyInstance) {

  // GET /telegram-bots — lista bots da empresa (token mascarado)
  app.get("/", { preHandler: [requireAuth(app)] }, async (request) => {
    const companyId = await resolveCompanyId(request);
    const bots = await prisma.telegramBot.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    });
    return bots.map(botView);
  });

  // POST /telegram-bots — cadastra novo bot
  app.post("/", { preHandler: [requireAuth(app)] }, async (request, reply) => {
    const companyId = await resolveCompanyId(request);
    const data = BotBody.parse(request.body);

    // Verifica se token já está cadastrado na empresa
    const exists = await prisma.telegramBot.findFirst({
      where: { companyId, token: data.token },
    });
    if (exists) {
      reply.status(409);
      return { error: "TOKEN_ALREADY_EXISTS", message: "Este token já está cadastrado." };
    }

    const bot = await prisma.telegramBot.create({
      data: { companyId, ...data },
    });
    reply.status(201);
    return botView(bot);
  });

  // PUT /telegram-bots/:id — atualiza bot
  app.put("/:id", { preHandler: [requireAuth(app)] }, async (request, reply) => {
    const companyId = await resolveCompanyId(request);
    const { id } = request.params as { id: string };
    const data = BotUpdateBody.parse(request.body);

    const existing = await prisma.telegramBot.findFirst({ where: { id, companyId } });
    if (!existing) { reply.status(404); return { error: "NOT_FOUND" }; }

    const bot = await prisma.telegramBot.update({
      where: { id },
      data: {
        ...(data.name     !== undefined && { name:     data.name }),
        ...(data.username !== undefined && { username: data.username }),
        ...(data.token    !== undefined && { token:    data.token }),
        ...(data.active   !== undefined && { active:   data.active }),
      },
    });
    return botView(bot);
  });

  // DELETE /telegram-bots/:id
  app.delete("/:id", { preHandler: [requireAuth(app)] }, async (request, reply) => {
    const companyId = await resolveCompanyId(request);
    const { id } = request.params as { id: string };

    const existing = await prisma.telegramBot.findFirst({ where: { id, companyId } });
    if (!existing) { reply.status(404); return { error: "NOT_FOUND" }; }

    // Desvincula destinatários que usam este bot
    await prisma.routineRecipient.updateMany({
      where: { companyId, telegramBotId: id },
      data:  { telegramBotId: null },
    });

    await prisma.telegramBot.delete({ where: { id } });
    return { ok: true };
  });

  // POST /telegram-bots/:id/test — envia mensagem de teste ao chatId informado
  app.post("/:id/test", { preHandler: [requireAuth(app)] }, async (request, reply) => {
    const companyId = await resolveCompanyId(request);
    const { id } = request.params as { id: string };
    const { chatId } = z.object({ chatId: z.string().min(1) }).parse(request.body);

    const bot = await prisma.telegramBot.findFirst({ where: { id, companyId } });
    if (!bot) { reply.status(404); return { error: "NOT_FOUND" }; }

    const ok = await sendMessageWithToken(
      bot.token,
      chatId,
      `✅ <b>Teste de bot — ${bot.name}</b>\n\nSe você recebeu esta mensagem, o bot está configurado corretamente!`
    );
    return { ok };
  });
}
