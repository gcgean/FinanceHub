import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { insightsService } from "../services/insights.service";
import { prisma } from "../../../lib/prisma";
import { AIInsightStatus } from "@prisma/client";
import { queueService } from "../services/queue.service";

const GenerateSnapshotSchema = z.object({
  date: z.string().datetime().optional(), // ISO String
});

const GetHistorySchema = z.object({
  metricKey: z.string().min(1),
  days: z.coerce.number().min(1).max(365).default(30),
});

const ListEventsSchema = z.object({
  status: z.nativeEnum(AIInsightStatus).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const FeedbackSchema = z.object({
  feedbackType: z.enum(["USEFUL", "IRRELEVANT", "FALSE_POSITIVE", "TOO_FREQUENT", "OTHER"]),
  comment: z.string().optional()
});

export class InsightsController {
  async generateSnapshot(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.user as { companyId: string };
    // @ts-ignore
    const body = GenerateSnapshotSchema.parse(request.body || {});

    const date = body.date ? new Date(body.date) : new Date();
    const result = await insightsService.generateDailySnapshot(companyId, date);

    return reply.status(201).send(result);
  }

  async getHistory(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.user as { companyId: string };
    // @ts-ignore
    const query = GetHistorySchema.parse(request.query);

    const history = await insightsService.getMetricHistory(companyId, query.metricKey, query.days);
    return reply.send(history);
  }

  async getContext(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.user as { companyId: string };

    const context = await insightsService.getFinancialContext(companyId);
    return reply.send({ context });
  }

  async triggerAnalysis(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.user as { companyId: string };
    
    // Enfileirar job ao invés de rodar direto
    const job = await queueService.addJob("INSIGHTS_GENERATION", { companyId });
    
    return reply.status(202).send({ 
      message: "Análise enfileirada com sucesso", 
      jobId: job.id,
      status: job.status 
    });
  }

  async listEvents(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.user as { companyId: string };
    // @ts-ignore
    const query = ListEventsSchema.parse(request.query);

    const events = await prisma.aIInsightEvent.findMany({
      where: {
        companyId,
        status: query.status ? query.status : undefined
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: {
        rule: true
      }
    });

    return reply.send(events);
  }

  async saveFeedback(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { id: userId, companyId } = request.user as { id: string, companyId: string };
    
    // @ts-ignore
    const body = FeedbackSchema.parse(request.body);

    const event = await prisma.aIInsightEvent.findFirst({
      where: { id, companyId }
    });
    
    if (!event) {
      return reply.status(404).send({ message: "Insight não encontrado" });
    }

    const feedback = await prisma.aIInsightFeedback.create({
      data: {
        insightEventId: id,
        userId,
        feedbackType: body.feedbackType,
        comment: body.comment
      }
    });

    return reply.status(201).send(feedback);
  }
}

export const insightsController = new InsightsController();


