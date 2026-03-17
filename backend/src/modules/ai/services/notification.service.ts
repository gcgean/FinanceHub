import { prisma } from "../../../lib/prisma";
import { AIChannelType, AIInsightDeliveryStatus } from "@prisma/client";

export class NotificationService {
  /**
   * Envia as notificações para os destinatários de um Insight Event.
   * @param eventId ID do AIInsightEvent
   */
  async dispatchInsightEvent(eventId: string) {
    const event = await prisma.aIInsightEvent.findUnique({
      where: { id: eventId },
      include: {
        recipients: true,
        company: true,
      },
    });

    if (!event) {
      console.warn(`[NotificationService] Evento ${eventId} não encontrado.`);
      return;
    }

    console.log(`[NotificationService] Disparando notificações para o evento: ${event.title}`);

    for (const recipient of event.recipients) {
      try {
        await this.processRecipient(event, recipient);
      } catch (error) {
        console.error(`[NotificationService] Erro ao processar recipient ${recipient.id}:`, error);
      }
    }
  }

  private async processRecipient(event: any, recipient: any) {
    // 1. Determinar o canal e o target
    let channelsToUse: Array<{ type: AIChannelType; target: string }> = [];

    if (recipient.userId) {
      // Buscar canais configurados para o usuário
      const userChannels = await prisma.aINotificationChannel.findMany({
        where: {
          userId: recipient.userId,
          enabled: true,
        },
      });

      if (userChannels.length > 0) {
        channelsToUse = userChannels.map(c => ({ type: c.type, target: c.target }));
      } else {
        // Fallback: se o usuário não tem canais configurados, assume IN_APP e talvez tente buscar o email
        const user = await prisma.user.findUnique({ where: { id: recipient.userId } });
        if (user) {
          channelsToUse.push({ type: 'EMAIL', target: user.email });
        }
        channelsToUse.push({ type: 'IN_APP', target: recipient.userId });
      }
    } else if (recipient.externalChannelTarget) {
      // Destinatário externo (sem usuário no sistema)
      channelsToUse.push({
        type: recipient.channelType,
        target: recipient.externalChannelTarget,
      });
    } else {
      console.warn(`[NotificationService] Recipient ${recipient.id} sem userId e sem externalChannelTarget. Ignorando.`);
      return;
    }

    // 2. Para cada canal, "enviar" a notificação e registrar o log
    for (const channel of channelsToUse) {
      await this.sendNotification(event, recipient, channel.type, channel.target);
    }

    // 3. Atualizar status do recipient para SENT
    await prisma.aIInsightRecipient.update({
      where: { id: recipient.id },
      data: {
        deliveryStatus: AIInsightDeliveryStatus.SENT,
        deliveredAt: new Date(),
      },
    });
  }

  private async sendNotification(event: any, recipient: any, type: AIChannelType, target: string) {
    console.log(`[NotificationService] Enviando [${type}] para ${target}: ${event.title}`);

    let status = 'SENT';
    let providerResponse = '';

    try {
      // Mock do envio real baseado no tipo
      switch (type) {
        case 'EMAIL':
          // Ex: await emailProvider.send(...)
          providerResponse = '{"status": "ok", "messageId": "mock-email-id"}';
          break;
        case 'WHATSAPP':
          // Ex: await whatsappProvider.send(...)
          providerResponse = '{"status": "ok", "messageId": "mock-wa-id"}';
          break;
        case 'TELEGRAM':
          // Ex: await telegramProvider.send(...)
          providerResponse = '{"status": "ok", "messageId": "mock-tg-id"}';
          break;
        case 'IN_APP':
          // Notificação no sistema, já visível na interface se associada ao userId
          providerResponse = '{"status": "ok"}';
          break;
        default:
          providerResponse = '{"status": "unknown_channel"}';
          break;
      }
    } catch (error: any) {
      status = 'FAILED';
      providerResponse = JSON.stringify({ error: error.message });
      console.error(`[NotificationService] Falha ao enviar [${type}] para ${target}:`, error);
    }

    // Registrar o log
    await prisma.aINotificationLog.create({
      data: {
        companyId: event.companyId,
        insightEventId: event.id,
        channelType: type,
        target,
        status,
        providerResponse,
        deliveredAt: status === 'SENT' ? new Date() : null,
      },
    });
  }
}

export const notificationService = new NotificationService();
