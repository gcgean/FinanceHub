import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody, parseQuery } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { UserRole } from "@prisma/client";

const CompanyBody = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional().nullable(),
});

const ListQuery = z.object({
  q: z.string().optional(),
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
});

export async function companiesRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN])] },
    async (request) => {
      const { q, take, skip } = parseQuery(ListQuery, request.query);
      const where = q
        ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { cnpj: { contains: q, mode: "insensitive" as const } }] }
        : {};
      const [items, total] = await Promise.all([
        prisma.company.findMany({ where, take, skip, orderBy: { createdAt: "desc" } }),
        prisma.company.count({ where }),
      ]);
      return { items, total, take, skip };
    }
  );

  app.get(
    "/me",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      if (request.user.role === UserRole.ADMIN) {
        return { company: null };
      }
      const company = await prisma.company.findUnique({ where: { id: request.user.companyId! } });
      if (!company) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      return { company };
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN])] },
    async (request) => {
      const { name, cnpj } = parseBody(CompanyBody, request.body);
      return prisma.company.create({ data: { name, cnpj: cnpj ?? null } });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN])] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const { name, cnpj } = parseBody(CompanyBody, request.body);
      return prisma.company.update({ where: { id: params.id }, data: { name, cnpj: cnpj ?? null } });
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN])] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      await prisma.company.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}

