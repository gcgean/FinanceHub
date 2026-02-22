import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody, parseQuery } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { ImportSource, ImportStatus, UserRole } from "@prisma/client";
import crypto from "crypto";

const EventsBody = z.object({
  entity: z.string().min(1),
  items: z.array(z.object({ externalId: z.string().optional(), updatedAt: z.string().optional(), payload: z.record(z.any()) })).min(1),
});

const AdminCompanyQuery = z.object({ companyId: z.string().optional() });

export async function integrationsRoutes(app: FastifyInstance) {
  app.post(
    "/:dataSourceId/events",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ dataSourceId: z.string().min(1) }).parse(request.params);
      const { entity, items } = parseBody(EventsBody, request.body);
      const { companyId: companyIdFromQuery } = parseQuery(AdminCompanyQuery, request.query);
      const companyId = request.user.role === UserRole.ADMIN ? (companyIdFromQuery ?? request.user.companyId) : request.user.companyId;
      if (!companyId) throw Object.assign(new Error("COMPANY_REQUIRED"), { statusCode: 400 });

      const ds = await prisma.dataSource.findUnique({ where: { id: params.dataSourceId } });
      if (!ds || (ds.companyId ?? companyId) !== companyId) throw Object.assign(new Error("DATASOURCE_NOT_FOUND"), { statusCode: 404 });

      const job = await prisma.importJob.create({
        data: {
          companyId,
          dataSourceId: ds.id,
          source: ImportSource.API,
          status: ImportStatus.QUEUED,
          origin: "API",
          entity,
          requestedByUserId: request.user.sub,
          statsJson: JSON.stringify({ received: items.length }),
        },
      });

      for (const it of items) {
        const payloadStr = JSON.stringify(it.payload ?? {});
        const payloadHash = crypto.createHash("sha256").update(payloadStr).digest("hex");
        try {
          await prisma.rawEvent.create({
            data: {
              companyId,
              dataSourceId: ds.id,
              importJobId: job.id,
              entity,
              externalId: it.externalId ?? null,
              payload: payloadStr,
              payloadHash,
            },
          });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "ERROR";
          await prisma.importError.create({
            data: {
              companyId,
              importJobId: job.id,
              entity,
              errorCode: "RAW_EVENT_CREATE_FAILED",
              message,
            },
          });
        }
      }

      return { importJobId: job.id };
    }
  );
}
