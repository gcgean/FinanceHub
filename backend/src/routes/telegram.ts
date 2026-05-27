import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { UserRole } from "@prisma/client";
import {
  createLinkCode,
  sendToUser,
} from "../services/telegram.service.js";

export async function telegramRoutes(app: FastifyInstance) {
  // GET /telegram/status
  app.get(
    "/status",
    { preHandler: [requireAuth(app)] },
    async (request, reply) => {
      const userId = request.user.sub;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true, updatedAt: true },
      });
      return reply.send({
        connected: !!user?.telegramChatId,
        chatId: user?.telegramChatId ?? null,
        linkedAt: user?.telegramChatId ? user.updatedAt.toISOString() : null,
      });
    }
  );

  // POST /telegram/link-code
  app.post(
    "/link-code",
    { preHandler: [requireAuth(app)] },
    async (request, reply) => {
      const userId = request.user.sub;
      const code = await createLinkCode(userId);
      return reply.send({
        code,
        botUsername: "GestorFacilBot",
        expiresInMinutes: 10,
        deepLink: `https://t.me/GestorFacilBot?start=${code}`,
      });
    }
  );

  // DELETE /telegram/unlink
  app.delete(
    "/unlink",
    { preHandler: [requireAuth(app)] },
    async (request, reply) => {
      const userId = request.user.sub;
      await prisma.user.update({
        where: { id: userId },
        data: { telegramChatId: null },
      });
      return reply.send({ ok: true });
    }
  );

  // POST /telegram/test — testa o próprio usuário logado
  app.post(
    "/test",
    { preHandler: [requireAuth(app)] },
    async (request, reply) => {
      const userId = request.user.sub;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const testMessage =
        `🔔 <b>Mensagem de Teste — FinanceHub</b>\n\n` +
        `Olá, ${user?.name ?? "usuário"}! Esta é uma mensagem de teste para confirmar que sua integração com o Telegram está funcionando corretamente.\n\n` +
        `Você receberá notificações de relatórios e alertas aqui.`;
      const ok = await sendToUser(userId, testMessage);
      if (!ok) {
        throw Object.assign(new Error("TELEGRAM_SEND_FAILED"), {
          statusCode: 400,
        });
      }
      return reply.send({ ok: true });
    }
  );

  // POST /telegram/test/:userId — admin envia teste para outro usuário
  app.post(
    "/test/:userId",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN])] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, telegramChatId: true },
      });
      if (!user) throw Object.assign(new Error("USER_NOT_FOUND"), { statusCode: 404 });
      if (!user.telegramChatId) throw Object.assign(new Error("TELEGRAM_NOT_CONNECTED"), { statusCode: 400 });

      const testMessage =
        `🔔 <b>Mensagem de Teste — FinanceHub</b>\n\n` +
        `Olá, ${user.name}! Esta é uma mensagem de teste enviada pelo administrador para confirmar que sua integração com o Telegram está ativa.\n\n` +
        `✅ Tudo funcionando!`;
      const ok = await sendToUser(userId, testMessage);
      if (!ok) throw Object.assign(new Error("TELEGRAM_SEND_FAILED"), { statusCode: 400 });
      return reply.send({ ok: true });
    }
  );
}
