import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function publicReportsRoutes(app: FastifyInstance) {
  // GET /public-reports/:token — sem autenticação, acesso público
  app.get("/:token", async (request, reply) => {
    const { token } = request.params as { token: string };

    const report = await prisma.publicReport.findUnique({
      where: { token },
      select: {
        id: true, token: true, title: true, content: true,
        context: true, type: true, periodFrom: true, periodTo: true,
        expiresAt: true, createdAt: true, metricas: true,
      },
    });

    if (!report) {
      return reply.status(404).send({ error: "REPORT_NOT_FOUND" });
    }

    if (new Date() > report.expiresAt) {
      return reply.status(410).send({ error: "REPORT_EXPIRED" });
    }

    return report;
  });
}
