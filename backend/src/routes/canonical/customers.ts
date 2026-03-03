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
  knownName: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  value: z.coerce.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function customersRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { take, skip, q, status } = parseQuery(ListQuery, request.query);
      const companyId = await resolveCompanyId(request);
      const where: Prisma.CustomerWhereInput = {
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
        prisma.customer.findMany({ where, take, skip, orderBy: { createdAt: "desc" } }),
        prisma.customer.count({ where }),
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
        knownName: b.knownName ?? null,
        externalId: b.externalId ?? null,
        document: docDigits ?? null,
        email: b.email ?? null,
        phone: b.phone ?? null,
        phone2: b.phone2 ?? null,
        birthDate: b.birthDate ? new Date(b.birthDate) : null,
        city: cityName,
        state: stateCode,
        cityId,
        stateCode,
        neighborhood: b.neighborhood ?? null,
        value: b.value ?? null,
        isActive: b.isActive ?? true,
      };

      if (docKey) {
        const existingByDoc = await prisma.customer.findFirst({
          where: {
            companyId,
            document: docDigits && docDigits.length === 14 ? { startsWith: docKey } : docKey,
          },
          orderBy: { createdAt: "asc" },
        });
        if (existingByDoc) {
          return prisma.customer.update({
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
        return prisma.customer.upsert({
          where: { companyId_externalId: { companyId, externalId: b.externalId } },
          create: data,
          update: { ...data, companyId: undefined, externalId: undefined },
        });
      }

      return prisma.customer.create({ data });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const b = parseBody(Body.partial(), request.body);
      const existing = await prisma.customer.findUnique({ where: { id: params.id } });
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
      return prisma.customer.update({
        where: { id: params.id },
        data: {
          name: b.name,
          knownName: b.knownName === undefined ? undefined : b.knownName,
          externalId: b.externalId === undefined ? undefined : b.externalId,
          document: b.document === undefined ? undefined : b.document,
          email: b.email === undefined ? undefined : b.email,
          phone: b.phone === undefined ? undefined : b.phone,
          phone2: b.phone2 === undefined ? undefined : b.phone2,
          birthDate: b.birthDate === undefined ? undefined : (b.birthDate ? new Date(b.birthDate) : null),
          city: cityName === undefined ? undefined : cityName ?? null,
          state: stateCode === undefined ? undefined : (stateCode ?? null),
          cityId: cityId === undefined ? undefined : cityId ?? null,
          stateCode: stateCode === undefined ? undefined : (stateCode ?? null),
          neighborhood: b.neighborhood === undefined ? undefined : b.neighborhood,
          value: b.value === undefined ? undefined : b.value,
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
      const existing = await prisma.customer.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && existing.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      await prisma.customer.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );

  app.get(
    "/deactivation-reasons",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const list = await prisma.customerDeactivationReason.findMany({
        where: { companyId, active: true },
        orderBy: { description: "asc" },
      });
      return list;
    }
  );

  app.post(
    "/deactivation-reasons",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const b = z.object({
        description: z.string().min(1),
        externalId: z.string().optional().nullable(),
        active: z.boolean().optional(),
      }).parse(request.body);
      const created = await prisma.customerDeactivationReason.upsert({
        where: b.externalId ? { companyId_externalId: { companyId, externalId: b.externalId } } : { companyId_externalId: { companyId, externalId: "__NA__" } },
        create: {
          companyId,
          description: b.description,
          externalId: b.externalId ?? null,
          active: b.active ?? true,
        },
        update: {
          description: b.description,
          active: b.active ?? true,
        },
      });
      return created;
    }
  );

  app.patch(
    "/deactivation-reasons/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const b = z.object({
        description: z.string().optional(),
        externalId: z.string().optional().nullable(),
        active: z.boolean().optional(),
      }).parse(request.body);
      const existing = await prisma.customerDeactivationReason.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      return prisma.customerDeactivationReason.update({
        where: { id: params.id },
        data: {
          description: b.description === undefined ? undefined : b.description,
          externalId: b.externalId === undefined ? undefined : b.externalId,
          active: b.active === undefined ? undefined : b.active,
        },
      });
    }
  );

  app.get(
    "/deactivations",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const list = await prisma.customerDeactivation.findMany({
        where: { companyId },
        orderBy: { deactivatedAt: "desc" },
        include: {
          customer: { select: { name: true, document: true, externalId: true } },
          reasonRef: { select: { description: true, id: true, externalId: true } },
        },
      });
      return list;
    }
  );

  app.post(
    "/:id/deactivations",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const existing = await prisma.customer.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      const body = z.object({
        value: z.coerce.number().optional().nullable(),
        reason: z.string().optional().nullable(),
        reasonId: z.string().optional().nullable(),
        deactivatedAt: z.string().optional(),
      }).parse(request.body);
      let reasonId: string | null = null;
      if (body.reasonId) {
        const rr = await prisma.customerDeactivationReason.findUnique({ where: { id: body.reasonId } });
        if (!rr || rr.companyId !== companyId) throw Object.assign(new Error("INVALID_REASON"), { statusCode: 400 });
        reasonId = rr.id;
      }
      const deact = await prisma.customerDeactivation.create({
        data: {
          companyId,
          customerId: existing.id,
          value: body.value ?? existing.value ?? null,
          reason: body.reason ?? null,
          reasonId,
          deactivatedAt: body.deactivatedAt ? new Date(body.deactivatedAt) : new Date(),
        },
      });
      await prisma.customer.update({
        where: { id: existing.id },
        data: { isActive: false, deactivatedAt: deact.deactivatedAt },
      });
      return deact;
    }
  );
}
