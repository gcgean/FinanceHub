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
  status: z.enum(["active", "inactive", "all"]).optional(),
});

const Body = z.object({
  name: z.string().min(1),
  externalId: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function suppliersRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { take, skip, q, status } = parseQuery(ListQuery, request.query);
      const companyId = await resolveCompanyId(request);
      const where: Prisma.SupplierWhereInput = {
        companyId,
        ...(status === "active" ? { isActive: true } : {}),
        ...(status === "inactive" ? { isActive: false } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { document: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        prisma.supplier.findMany({ where, take, skip, orderBy: { createdAt: "desc" } }),
        prisma.supplier.count({ where }),
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
      const normalizeDoc = (s: string) => s.replace(/[^\d]/g, "");
      const docDigits = b.document ? normalizeDoc(b.document) : null;
      const docKey = docDigits ? (docDigits.length === 14 ? docDigits.slice(0, 8) : docDigits) : null;
      let cityName = b.city ?? null;
      let stateCode = (b.stateCode ?? b.state ?? null) as string | null;
      const cityId = b.cityId ?? null;
      if (cityId) {
        const c = await prisma.city.findUnique({ where: { id: cityId } });
        if (c) {
          cityName = c.name;
          stateCode = c.stateCode;
        }
      }
      const data = {
        companyId,
        name: b.name,
        externalId: b.externalId ?? null,
        document: docDigits ?? null,
        email: b.email ?? null,
        phone: b.phone ?? null,
        city: cityName,
        state: stateCode,
        cityId,
        stateCode,
        isActive: b.isActive ?? true,
      };

      if (docKey) {
        const existingByDoc = await prisma.supplier.findFirst({
          where: {
            companyId,
            document: docDigits && docDigits.length === 14 ? { startsWith: docKey } : docKey,
          },
          orderBy: { createdAt: "asc" },
        });
        if (existingByDoc) {
          return prisma.supplier.update({
            where: { id: existingByDoc.id },
            data: {
              ...data,
              companyId: undefined,
              document: undefined,
              externalId: existingByDoc.externalId ? undefined : b.externalId ?? undefined,
            },
          });
        }
      }

      if (b.externalId) {
        return prisma.supplier.upsert({
          where: { companyId_externalId: { companyId, externalId: b.externalId } },
          create: data,
          update: { ...data, companyId: undefined, externalId: undefined },
        });
      }

      return prisma.supplier.create({ data });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const b = parseBody(Body.partial(), request.body);
      const existing = await prisma.supplier.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && existing.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      let cityName = b.city;
      let stateCode = b.stateCode ?? b.state;
      const cityId = b.cityId;
      if (cityId) {
        const c = await prisma.city.findUnique({ where: { id: cityId } });
        if (c) {
          cityName = c.name;
          stateCode = c.stateCode;
        }
      }
      return prisma.supplier.update({
        where: { id: params.id },
        data: {
          name: b.name,
          externalId: b.externalId === undefined ? undefined : b.externalId,
          document: b.document === undefined ? undefined : b.document,
          email: b.email === undefined ? undefined : b.email,
          phone: b.phone === undefined ? undefined : b.phone,
          city: cityName === undefined ? undefined : cityName ?? null,
          state: stateCode === undefined ? undefined : (stateCode ?? null),
          cityId: cityId === undefined ? undefined : cityId ?? null,
          stateCode: stateCode === undefined ? undefined : (stateCode ?? null),
          isActive: b.isActive === undefined ? undefined : b.isActive,
        },
      });
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const existing = await prisma.supplier.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && existing.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      await prisma.supplier.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}
