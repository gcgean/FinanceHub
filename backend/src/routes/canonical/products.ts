import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { parseBody, parseQuery } from "../../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../../lib/auth";
import { UserRole, Prisma } from "@prisma/client";
import { resolveCompanyId } from "../../lib/company";

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().optional(),
});

const Body = z.object({
  code: z.string().min(1).optional(),
  externalId: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  name: z.string().min(1),
  section: z.string().optional().nullable(),
  group: z.string().optional().nullable(),
  subgroup: z.string().optional().nullable(),
  brandName: z.string().optional().nullable(),
  costPrice: z.number().optional().nullable(),
  salePrice: z.number().optional().nullable(),
  active: z.boolean().optional(),
});

export async function productsRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { take, skip, q } = parseQuery(ListQuery, request.query);
      const companyId = await resolveCompanyId(request);
      const where: Prisma.ProductWhereInput = {
        companyId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
                { barcode: { contains: q, mode: "insensitive" } },
                { section: { contains: q, mode: "insensitive" } },
                { group: { contains: q, mode: "insensitive" } },
                { subgroup: { contains: q, mode: "insensitive" } },
                { brandName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        prisma.product.findMany({ where, take, skip, orderBy: { createdAt: "desc" } }),
        prisma.product.count({ where }),
      ]);
      return { items, total, take, skip };
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const b = parseBody(Body, request.body);
      const data = {
        companyId,
        externalId: b.externalId ?? null,
        sku: b.sku ?? null,
        barcode: b.barcode ?? null,
        name: b.name,
        section: b.section ?? null,
        group: b.group ?? null,
        subgroup: b.subgroup ?? null,
        brandName: b.brandName ?? null,
        costPrice: b.costPrice ?? null,
        salePrice: b.salePrice ?? null,
        active: b.active ?? true,
      };

      if (b.externalId) {
        // For upsert, we need code only on create if it's not provided.
        // If updating, we don't touch code.
        // But prisma upsert requires all create fields.
        const codeForCreate =
          b.code && b.code.trim()
            ? b.code.trim()
            : await (async () => {
                const existing = await prisma.product.findMany({ where: { companyId }, select: { code: true } });
                const numeric = existing.map((x) => Number.parseInt(x.code, 10)).filter((n) => Number.isFinite(n));
                const next = (numeric.length ? Math.max(...numeric) : 0) + 1;
                return String(next).padStart(6, "0");
              })();

        return prisma.product.upsert({
          where: { companyId_externalId: { companyId, externalId: b.externalId } },
          create: { ...data, code: codeForCreate },
          update: { ...data, companyId: undefined, externalId: undefined },
        });
      }

      const code =
        b.code && b.code.trim()
          ? b.code.trim()
          : await (async () => {
              const existing = await prisma.product.findMany({ where: { companyId }, select: { code: true } });
              const numeric = existing.map((x) => Number.parseInt(x.code, 10)).filter((n) => Number.isFinite(n));
              const next = (numeric.length ? Math.max(...numeric) : 0) + 1;
              return String(next).padStart(6, "0");
            })();

      return prisma.product.create({
        data: { ...data, code },
      });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const b = parseBody(Body.partial(), request.body);
      const existing = await prisma.product.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && existing.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      return prisma.product.update({
        where: { id: params.id },
        data: {
          code: b.code === undefined ? undefined : b.code,
          externalId: b.externalId === undefined ? undefined : b.externalId,
          sku: b.sku === undefined ? undefined : b.sku,
          barcode: b.barcode === undefined ? undefined : b.barcode,
          name: b.name,
          section: b.section === undefined ? undefined : b.section,
          group: b.group === undefined ? undefined : b.group,
          subgroup: b.subgroup === undefined ? undefined : b.subgroup,
          brandName: b.brandName === undefined ? undefined : b.brandName,
          costPrice: b.costPrice === undefined ? undefined : b.costPrice,
          salePrice: b.salePrice === undefined ? undefined : b.salePrice,
          active: b.active === undefined ? undefined : b.active,
        },
      });
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const existing = await prisma.product.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && existing.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      await prisma.product.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}
