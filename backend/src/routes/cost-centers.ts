import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { resolveCompanyId } from "../lib/company";
import { UserRole } from "@prisma/client";

const CostCenterBody = z.object({
  code: z.string().min(1).optional(),
  externalCode: z.string().optional().nullable(),
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
      const code = data.code
        ? data.code
        : await (async () => {
            const existing = await prisma.costCenter.findMany({ where: { companyId }, select: { code: true } });
            const numeric = existing
              .map((x) => Number.parseInt(x.code, 10))
              .filter((n) => Number.isFinite(n));
            const next = (numeric.length ? Math.max(...numeric) : 0) + 1;
            return String(next).padStart(2, "0");
          })();
      try {
        return await prisma.costCenter.create({
          data: {
            companyId,
            code,
            externalCode: data.externalCode ?? null,
            description: data.description,
            active: data.active ?? true,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("COST_CENTER_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }
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
      try {
        return await prisma.costCenter.update({ where: { id: params.id }, data });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("COST_CENTER_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const existing = await prisma.costCenter.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      const inUse = await prisma.bankLedgerEntrySplit.count({ where: { costCenterId: params.id } });
      if (inUse > 0) throw Object.assign(new Error("CANNOT_DELETE_IN_USE"), { statusCode: 400 });
      await prisma.costCenter.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}
