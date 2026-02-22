import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { parseBody } from "../../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../../lib/auth";
import { UserRole } from "@prisma/client";
import { resolveCompanyId } from "../../lib/company";
import { syncIntegration } from "../../services/sync";

const Body = z.object({
  erp: z.string().min(1),
  apiUrl: z.string().min(1),
  apiKey: z.string().min(1),
});

const SyncBody = z.object({
  erp: z.string().min(1),
});

export async function integrationsSettingsRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const integrations = await prisma.integration.findMany({
        where: { companyId },
        select: {
          erp: true,
          apiUrl: true,
          lastSyncAt: true,
          lastSyncStatus: true,
          syncErrorMessage: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      return { items: integrations };
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const b = parseBody(Body, request.body);

      // TODO: Encrypt b.apiKey before saving

      return prisma.integration.upsert({
        where: {
          companyId_erp: {
            companyId,
            erp: b.erp,
          },
        },
        create: {
          companyId,
          erp: b.erp,
          apiUrl: b.apiUrl,
          apiKey: b.apiKey,
        },
        update: {
          apiUrl: b.apiUrl,
          apiKey: b.apiKey,
        },
      });
    }
  );

  app.post(
    "/test",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN]), requireCompanyScope()] },
    async (request) => {
      const b = parseBody(Body, request.body);

      // Simulate API call
      if (b.apiUrl && b.apiKey) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, message: "Conexão bem-sucedida!" };
      }

      return { success: false, message: "Credenciais inválidas." };
    }
  );

  app.post(
    "/sync",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN]), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { erp } = parseBody(SyncBody, request.body);

      const integration = await prisma.integration.findUnique({
        where: { companyId_erp: { companyId, erp } },
      });

      if (!integration) {
        return reply.code(404).send({ message: "Integração não encontrada." });
      }

      // Execute sync in the background
      syncIntegration(integration).catch(console.error);

      return reply.code(202).send({ message: "Sincronização iniciada em segundo plano." });
    }
  );
}
