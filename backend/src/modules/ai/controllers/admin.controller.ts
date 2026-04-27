import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma.js";
import { UserRole, JobStatus } from "@prisma/client";

export class AdminController {
  async getStats(request: FastifyRequest, reply: FastifyReply) {
    // Only Admin
    if (request.user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const [totalInsights, totalTasks, failedJobs, calibrationRules] = await Promise.all([
      prisma.aIInsightEvent.count(),
      prisma.aITask.count(),
      prisma.backgroundJob.count({ where: { status: JobStatus.FAILED } }),
      prisma.aIInsightRule.count({ where: { enabled: true } })
    ]);

    return reply.send({
      totalInsights,
      totalTasks,
      failedJobs,
      calibrationRules
    });
  }

  async listJobs(request: FastifyRequest, reply: FastifyReply) {
    if (request.user.role !== UserRole.ADMIN) return reply.status(403).send({ message: "Forbidden" });

    const jobs = await prisma.backgroundJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return reply.send(jobs);
  }

  async retryJob(request: FastifyRequest, reply: FastifyReply) {
    if (request.user.role !== UserRole.ADMIN) return reply.status(403).send({ message: "Forbidden" });
    const { id } = request.params as { id: string };

    const job = await prisma.backgroundJob.findUnique({ where: { id } });
    if (!job) return reply.status(404).send({ message: "Job not found" });

    const updated = await prisma.backgroundJob.update({
      where: { id },
      data: {
        status: JobStatus.PENDING,
        attempts: 0,
        lastError: null,
        runAt: new Date() // Run now
      }
    });

    return reply.send(updated);
  }

  async getCalibrationStats(request: FastifyRequest, reply: FastifyReply) {
    if (request.user.role !== UserRole.ADMIN) return reply.status(403).send({ message: "Forbidden" });

    const rules = await prisma.aIInsightRule.findMany({
      include: {
        _count: {
          select: { events: true }
        }
      }
    });

    // Calculate feedback stats for each rule
    const stats = await Promise.all(rules.map(async (rule) => {
      const feedbacks = await prisma.aIInsightFeedback.groupBy({
        by: ['feedbackType'],
        where: { insightEvent: { ruleId: rule.id } },
        _count: true
      });

      const totalFeedback = feedbacks.reduce((acc, curr) => acc + curr._count, 0);
      const positive = feedbacks.find(f => f.feedbackType === 'USEFUL')?._count || 0;
      const negative = feedbacks.find(f => ['FALSE_POSITIVE', 'IRRELEVANT'].includes(f.feedbackType))?._count || 0;

      return {
        ...rule,
        stats: {
          totalEvents: rule._count.events,
          totalFeedback,
          positive,
          negative,
          approvalRate: totalFeedback > 0 ? positive / totalFeedback : 0
        }
      };
    }));

    return reply.send(stats);
  }
}

export const adminController = new AdminController();
