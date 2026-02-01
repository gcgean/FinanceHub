import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { resolveCompanyId } from "../lib/company";
import { UserRole } from "@prisma/client";

const CostCenterBody = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  active: z.boolean().optional(),
});

export async function costCentersRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      return prisma.costCenter.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const data = parseBody(CostCenterBody, request.body);
      return prisma.costCenter.create({
        data: {
          companyId,
          code: data.code,
          description: data.description,
          active: data.active ?? true,
        },
      });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const data = parseBody(CostCenterBody.partial(), request.body);
      const existing = await prisma.costCenter.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      return prisma.costCenter.update({ where: { id: params.id }, data });
    }
  );
}

