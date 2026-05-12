import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma, TransactionType, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { parseBody, parseQuery } from "../lib/validation.js";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth.js";
import { resolveCompanyId } from "../lib/company.js";

const ListQuery = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

const CategoryBody = z.object({
  name: z.string().min(1).max(120),
  type: z.nativeEnum(TransactionType),
  color: z.string().min(1).max(20).optional().nullable(),
  active: z.boolean().optional(),
});

export async function categoriesRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const { type, active, search } = parseQuery(ListQuery, request.query);

      const where: Prisma.FinanceCategoryWhereInput = {
        companyId,
        ...(type ? { type } : {}),
        ...(active === undefined ? {} : { active }),
        ...(search?.trim()
          ? { name: { contains: search.trim(), mode: "insensitive" } }
          : {}),
      };

      return prisma.financeCategory.findMany({
        where,
        orderBy: [{ active: "desc" }, { name: "asc" }],
      });
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const body = parseBody(CategoryBody, request.body);

      try {
        return await prisma.financeCategory.create({
          data: {
            companyId,
            name: body.name.trim(),
            type: body.type,
            color: body.color ?? null,
            active: body.active ?? true,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("CATEGORY_EXISTS"), { statusCode: 409 });
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
      const body = parseBody(CategoryBody.partial(), request.body);

      const existing = await prisma.financeCategory.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });

      try {
        return await prisma.financeCategory.update({
          where: { id: params.id },
          data: {
            name: body.name === undefined ? undefined : body.name.trim(),
            type: body.type,
            color: body.color === undefined ? undefined : body.color,
            active: body.active,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("CATEGORY_EXISTS"), { statusCode: 409 });
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
      const existing = await prisma.financeCategory.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      await prisma.financeCategory.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}

