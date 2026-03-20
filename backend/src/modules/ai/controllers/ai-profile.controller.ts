import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";
import { OpenAIProvider } from "../providers/openai.provider";
import { AnthropicProvider } from "../providers/anthropic.provider";
import { GeminiProvider } from "../providers/gemini.provider";
import { resolveCompanyId } from "../../../lib/company";

const UpdateProfileSchema = z.object({
  tone: z.enum(["formal", "casual", "technical"]).optional(),
  level: z.enum(["summary", "detailed"]).optional(),
  segment: z.enum(["GENERIC", "SOFTWARE", "RETAIL", "INDUSTRY", "SERVICES"]).optional(),
  aiProvider: z.string().optional().nullable(),
  openaiApiKey: z.string().optional().nullable(),
  anthropicApiKey: z.string().optional().nullable(),
  geminiApiKey: z.string().optional().nullable(),
});

export class AIProfileController {
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { companyId?: string; role?: string };
    const companyId = await resolveCompanyId(request);

    let profile = await prisma.aIProfile.findUnique({
      where: { companyId }
    });

    if (!profile) {
      profile = await prisma.aIProfile.create({
        data: { companyId }
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { aiProvider: true, openaiApiKey: true, anthropicApiKey: true, geminiApiKey: true }
    });

    return reply.send({
      ...profile,
      aiProvider: company?.aiProvider,
      openaiApiKey: company?.openaiApiKey,
      anthropicApiKey: company?.anthropicApiKey,
      geminiApiKey: company?.geminiApiKey,
    });
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { companyId?: string; role?: string };
    const companyId = await resolveCompanyId(request);

    const { aiProvider, openaiApiKey, anthropicApiKey, geminiApiKey, ...body } = UpdateProfileSchema.parse(request.body as unknown);

    const profile = await prisma.aIProfile.upsert({
      where: { companyId },
      create: {
        companyId,
        ...body
      },
      update: {
        ...body
      }
    });

    await prisma.company.update({
      where: { id: companyId },
      data: {
        aiProvider,
        openaiApiKey,
        anthropicApiKey,
        geminiApiKey
      }
    });

    return reply.send({
      ...profile,
      aiProvider,
      openaiApiKey,
      anthropicApiKey,
      geminiApiKey
    });
  }

  async testConnection(request: FastifyRequest, reply: FastifyReply) {
    const TestSchema = z.object({
      provider: z.string(),
      apiKey: z.string()
    });

    const { provider, apiKey } = TestSchema.parse(request.body);

    try {
      let llmProvider;
      if (provider === "openai") {
        llmProvider = new OpenAIProvider(apiKey);
      } else if (provider === "anthropic") {
        llmProvider = new AnthropicProvider(apiKey);
      } else if (provider === "gemini") {
        llmProvider = new GeminiProvider(apiKey);
      } else {
        return reply.send({ success: false, message: "Provedor desconhecido" });
      }

      const res = await llmProvider.generateResponse([{ role: "user", content: "Responda apenas a palavra 'OK' se você me escutar." }]);
      
      if (res.content.includes("OK") || res.content.length > 0) {
        return reply.send({ success: true, message: "Conexão estabelecida com sucesso." });
      } else {
        return reply.send({ success: false, message: "A API respondeu, mas o formato foi inesperado." });
      }
    } catch (error: any) {
      return reply.send({ success: false, message: `Erro: ${error.message}` });
    }
  }
}

export const aiProfileController = new AIProfileController();
