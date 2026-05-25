import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { parseBody, parseQuery } from "../lib/validation.js";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth.js";
import { UserRole } from "@prisma/client";

const CompanyBody = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  segmento: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  plan: z.enum(["BASIC", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).optional(),
  openaiApiKey: z.string().optional().nullable(),
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
      const { name, cnpj, email, segmento, phone, plan, status } = parseBody(CompanyBody, request.body);

      // Normaliza CNPJ para somente dígitos
      const cnpjNorm = cnpj ? cnpj.replace(/\D/g, "") : null;

      // Upsert por CNPJ normalizado: busca com LIKE para compatibilidade com dados legados formatados
      if (cnpjNorm) {
        const existing = await prisma.company.findFirst({
          where: {
            OR: [
              { cnpj: cnpjNorm },
              { cnpj: { contains: cnpjNorm } },
            ],
          },
        });
        if (existing) {
          const nextEmail = email === undefined ? existing.email : email ?? null;
          const nextSegmento = segmento === undefined ? existing.segmento : segmento ?? null;
          const nextPhone = phone === undefined ? existing.phone : phone ?? null;
          const nextPlan = plan === undefined ? existing.plan : plan;
          const nextStatus = status === undefined ? existing.status : status;
          if (
            existing.name === name &&
            existing.cnpj === cnpjNorm &&
            (existing.email ?? null) === (nextEmail ?? null) &&
            (existing.segmento ?? null) === (nextSegmento ?? null) &&
            (existing.phone ?? null) === (nextPhone ?? null) &&
            existing.plan === nextPlan &&
            existing.status === nextStatus
          ) {
            return existing;
          }

          return prisma.company.update({
            where: { id: existing.id },
            data: {
              name,
              cnpj: cnpjNorm,
              email: email === undefined ? undefined : email ?? null,
              segmento: segmento === undefined ? undefined : segmento ?? null,
              phone: phone === undefined ? undefined : phone ?? null,
              plan: plan === undefined ? undefined : plan,
              status: status === undefined ? undefined : status,
            },
          });
        }
      }

      return prisma.company.create({
        data: { name, cnpj: cnpjNorm, email: email ?? null, segmento: segmento ?? null, phone: phone ?? null, plan: plan ?? "PROFESSIONAL", status: status ?? "ACTIVE" },
      });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN])] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const { name, cnpj, email, segmento, phone, plan, status, openaiApiKey } = parseBody(CompanyBody, request.body);
      const existing = await prisma.company.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });

      const nextName = name;
      const nextCnpj = cnpj === undefined ? existing.cnpj : cnpj ?? null;
      const nextEmail = email === undefined ? existing.email : email ?? null;
      const nextSegmento = segmento === undefined ? existing.segmento : segmento ?? null;
      const nextPhone = phone === undefined ? existing.phone : phone ?? null;
      const nextPlan = plan === undefined ? existing.plan : plan;
      const nextStatus = status === undefined ? existing.status : status;
      const nextOpenaiApiKey = openaiApiKey === undefined ? existing.openaiApiKey : openaiApiKey ?? null;

      if (
        existing.name === nextName &&
        (existing.cnpj ?? null) === (nextCnpj ?? null) &&
        (existing.email ?? null) === (nextEmail ?? null) &&
        (existing.segmento ?? null) === (nextSegmento ?? null) &&
        (existing.phone ?? null) === (nextPhone ?? null) &&
        existing.plan === nextPlan &&
        existing.status === nextStatus &&
        (existing.openaiApiKey ?? null) === (nextOpenaiApiKey ?? null)
      ) {
        return existing;
      }

      return prisma.company.update({
        where: { id: params.id },
        data: {
          name,
          cnpj: cnpj === undefined ? undefined : cnpj ?? null,
          email: email === undefined ? undefined : email ?? null,
          segmento: segmento === undefined ? undefined : segmento ?? null,
          phone: phone === undefined ? undefined : phone ?? null,
          plan: plan === undefined ? undefined : plan,
          status: status === undefined ? undefined : status,
          openaiApiKey: openaiApiKey === undefined ? undefined : openaiApiKey ?? null,
        },
      });
    }
  );

  const AiProfileBody = z.object({
    aiPersona: z.string().optional().nullable(),
    aiDetailLevel: z.string().optional().nullable(),
    aiBusinessFocus: z.string().optional().nullable(),
    aiProvider: z.string().optional().nullable(),
    openaiApiKey: z.string().optional().nullable(),
    anthropicApiKey: z.string().optional().nullable(),
    geminiApiKey: z.string().optional().nullable(),
    segmento: z.string().optional().nullable(),
  });

  app.patch(
    "/me/ai-profile",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = request.user.companyId;
      if (!companyId) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });

      const { aiPersona, aiDetailLevel, aiBusinessFocus, aiProvider, openaiApiKey, anthropicApiKey, geminiApiKey, segmento } = parseBody(AiProfileBody, request.body);
      return prisma.company.update({
        where: { id: companyId },
        data: { aiPersona, aiDetailLevel, aiBusinessFocus, aiProvider, openaiApiKey, anthropicApiKey, geminiApiKey, segmento },
      });
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
