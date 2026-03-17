import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../../lib/prisma";
import { AIChannelType } from "@prisma/client";

export class NotificationController {
  // ---------------------------------------------------------
  // IN-APP NOTIFICATIONS
  // ---------------------------------------------------------

  /**
   * Lista notificações In-App do usuário logado
   */
  async getMyNotifications(request: FastifyRequest, reply: FastifyReply) {
    const { id: userId } = request.user as any as { id: string };

    const notifications = await prisma.aIInsightRecipient.findMany({
      where: {
        userId,
        channelType: "IN_APP",
      },
      include: {
        insightEvent: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limite para não sobrecarregar
    });

    return reply.send(notifications);
  }

  /**
   * Marca uma notificação In-App como lida
   */
  async markAsRead(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id: userId } = request.user as any as { id: string };
    const { id } = request.params;

    // Verificar se pertence ao usuário
    const recipient = await prisma.aIInsightRecipient.findUnique({
      where: { id },
    });

    if (!recipient || recipient.userId !== userId) {
      return reply.status(404).send({ error: "Notificação não encontrada" });
    }

    const updated = await prisma.aIInsightRecipient.update({
      where: { id },
      data: {
        readAt: new Date(),
      },
    });

    return reply.send(updated);
  }

  /**
   * Marca todas as notificações In-App do usuário como lidas
   */
  async markAllAsRead(request: FastifyRequest, reply: FastifyReply) {
    const { id: userId } = request.user as any as { id: string };

    await prisma.aIInsightRecipient.updateMany({
      where: {
        userId,
        channelType: "IN_APP",
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return reply.send({ success: true });
  }

  // ---------------------------------------------------------
  // NOTIFICATION CHANNELS (Configurações)
  // ---------------------------------------------------------

  /**
   * Lista canais de notificação configurados do usuário logado
   */
  async getMyChannels(request: FastifyRequest, reply: FastifyReply) {
    const { companyId, id: userId } = request.user as any as { companyId: string; id: string };

    const channels = await prisma.aINotificationChannel.findMany({
      where: {
        companyId,
        userId,
      },
    });

    return reply.send(channels);
  }

  /**
   * Cria ou atualiza um canal de notificação para o usuário
   */
  async saveChannel(
    request: FastifyRequest<{ Body: { type: AIChannelType; target: string; enabled: boolean } }>,
    reply: FastifyReply
  ) {
    const { companyId, id: userId } = request.user as any as { companyId: string; id: string };
    const { type, target, enabled } = request.body;

    // Verificar se já existe um canal do mesmo tipo para o usuário
    const existing = await prisma.aINotificationChannel.findFirst({
      where: {
        companyId,
        userId,
        type,
      },
    });

    if (existing) {
      const updated = await prisma.aINotificationChannel.update({
        where: { id: existing.id },
        data: { target, enabled },
      });
      return reply.send(updated);
    }

    const newChannel = await prisma.aINotificationChannel.create({
      data: {
        companyId,
        userId,
        type,
        target,
        enabled,
      },
    });

    return reply.status(201).send(newChannel);
  }

  /**
   * Remove um canal de notificação
   */
  async deleteChannel(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { companyId, id: userId } = request.user as any as { companyId: string; id: string };
    const { id } = request.params;

    const channel = await prisma.aINotificationChannel.findUnique({
      where: { id },
    });

    if (!channel || channel.companyId !== companyId || channel.userId !== userId) {
      return reply.status(404).send({ error: "Canal não encontrado" });
    }

    await prisma.aINotificationChannel.delete({
      where: { id },
    });

    return reply.status(204).send();
  }
}

export const notificationController = new NotificationController();
