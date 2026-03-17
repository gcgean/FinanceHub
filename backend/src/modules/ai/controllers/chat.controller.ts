import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { chatService } from "../services/chat.service";

const CreateChatSchema = z.object({
  title: z.string().optional(),
  sectorId: z.string().optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1),
});

export class ChatController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const { companyId, id: userId } = request.user as { companyId: string; id: string };
    const body = CreateChatSchema.parse(request.body);

    const chat = await chatService.createChat(companyId, userId, body.title, body.sectorId);
    return reply.status(201).send(chat);
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { companyId, id: userId } = request.user as { companyId: string; id: string };

    const chats = await chatService.listChats(companyId, userId);
    return reply.send(chats);
  }

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { companyId, id: userId } = request.user as { companyId: string; id: string };
    const { id: chatId } = request.params as { id: string };

    const chat = await chatService.getChat(chatId, companyId, userId);
    if (!chat) {
      return reply.status(404).send({ error: "Chat not found" });
    }
    return reply.send(chat);
  }

  async sendMessage(request: FastifyRequest, reply: FastifyReply) {
    const { companyId, id: userId } = request.user as { companyId: string; id: string };
    const { id: chatId } = request.params as { id: string };
    const { content } = SendMessageSchema.parse(request.body);

    const message = await chatService.sendMessage(chatId, companyId, userId, content);
    return reply.status(201).send(message);
  }
}

export const chatController = new ChatController();
