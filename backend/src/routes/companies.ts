import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { parseBody, parseQuery } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { UserRole } from "@prisma/client";

const CompanyBody = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  plan: z.enum(["BASIC", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).optional(),
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
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const tx = await prisma.transaction.groupBy({
        by: ["companyId"],
        where: { date: { gte: start, lte: end } },
        _count: { companyId: true },
      });
      const pend = await prisma.pendency.groupBy({
        by: ["companyId"],
        where: { status: { not: "RESOLVED" } },
        _count: { companyId: true },
      });
      const txMap = new Map(tx.map((r) => [r.companyId, r._count.companyId]));
      const pendMap = new Map(pend.map((r) => [r.companyId, r._count.companyId]));
      const withMetrics = items.map((c) => ({
        ...c,
        transactionsMonth: txMap.get(c.id) ?? 0,
        pendenciesOpen: pendMap.get(c.id) ?? 0,
      }));
      return { items: withMetrics, total, take, skip };
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
      const { name, cnpj, email, phone, plan, status } = parseBody(CompanyBody, request.body);
      
      // Verifica se já existe empresa com este CNPJ
      if (cnpj) {
        const existing = await prisma.company.findUnique({ where: { cnpj } });
        if (existing) {
          // Se já existe, atualiza em vez de criar (upsert logic simplificada)
          return prisma.company.update({
            where: { id: existing.id },
            data: { name, email: email ?? null, phone: phone ?? null, plan: plan ?? undefined, status: status ?? undefined }
          });
        }
      }
      
      return prisma.company.create({ data: { name, cnpj: cnpj ?? null, email: email ?? null, phone: phone ?? null, plan: plan ?? "PROFESSIONAL", status: status ?? "ACTIVE" } });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN])] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const { name, cnpj, email, phone, plan, status } = parseBody(CompanyBody, request.body);
      return prisma.company.update({ where: { id: params.id }, data: { name, cnpj: cnpj ?? null, email: email ?? null, phone: phone ?? null, plan: plan ?? undefined, status: status ?? undefined } });
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
