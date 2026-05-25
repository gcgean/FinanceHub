import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { parseBody, parseQuery } from "../../lib/validation.js";
import { requireAuth, requireCompanyScope, requireRole } from "../../lib/auth.js";
import { UserRole, Prisma } from "@prisma/client";
import { resolveCompanyId } from "../../lib/company.js";

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
  classificationId: z.string().optional().nullable(),
  classificationExternalId: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  value: z.coerce.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function customersRoutes(app: FastifyInstance) {
  const resolveClassificationId = async (
    companyId: string,
    classificationId?: string | null,
    classificationExternalId?: string | null
  ) => {
    if (classificationId === null || classificationExternalId === null) return null;
    if (classificationId) {
      const cls = await prisma.customerClassification.findUnique({ where: { id: classificationId } });
      if (!cls || cls.companyId !== companyId) throw Object.assign(new Error("INVALID_CLASSIFICATION"), { statusCode: 400 });
      return cls.id;
    }
    if (classificationExternalId) {
      const cls = await prisma.customerClassification.findFirst({
        where: { companyId, externalId: classificationExternalId },
      });
      if (!cls) throw Object.assign(new Error("INVALID_CLASSIFICATION"), { statusCode: 400 });
      return cls.id;
    }
    return undefined;
  };

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
        prisma.customer.findMany({
          where,
          take,
          skip,
          orderBy: { createdAt: "desc" },
          include: {
            classification: { select: { id: true, name: true, externalId: true } },
          },
        }),
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
      const classificationId = await resolveClassificationId(companyId, b.classificationId, b.classificationExternalId);
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
        classificationId: classificationId === undefined ? undefined : classificationId,
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
        route: b.route ?? null,
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
          const nextClassificationId = classificationId === undefined ? existingByDoc.classificationId : classificationId;
          const nextExternalId = existingByDoc.externalId ? existingByDoc.externalId : (b.externalId ?? null);
          const nextBirthDateIso = data.birthDate ? data.birthDate.toISOString().slice(0, 10) : null;
          const existingBirthDateIso = existingByDoc.birthDate ? existingByDoc.birthDate.toISOString().slice(0, 10) : null;

          if (
            existingByDoc.name === data.name &&
            existingByDoc.knownName === (data.knownName ?? null) &&
            existingByDoc.externalId === nextExternalId &&
            existingByDoc.email === (data.email ?? null) &&
            existingByDoc.phone === (data.phone ?? null) &&
            existingByDoc.phone2 === (data.phone2 ?? null) &&
            existingBirthDateIso === nextBirthDateIso &&
            existingByDoc.city === (data.city ?? null) &&
            existingByDoc.state === (data.state ?? null) &&
            existingByDoc.route === (data.route ?? null) &&
            existingByDoc.cityId === (data.cityId ?? null) &&
            existingByDoc.stateCode === (data.stateCode ?? null) &&
            existingByDoc.neighborhood === (data.neighborhood ?? null) &&
            (existingByDoc.value ?? null) === (data.value ?? null) &&
            existingByDoc.isActive === (data.isActive ?? true) &&
            existingByDoc.classificationId === nextClassificationId
          ) {
            return existingByDoc;
          }

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
        const existingByExternal = await prisma.customer.findUnique({
          where: { companyId_externalId: { companyId, externalId: b.externalId } },
        });
        if (existingByExternal) {
          const nextClassificationId = classificationId === undefined ? existingByExternal.classificationId : classificationId;
          const nextBirthDateIso = data.birthDate ? data.birthDate.toISOString().slice(0, 10) : null;
          const existingBirthDateIso = existingByExternal.birthDate ? existingByExternal.birthDate.toISOString().slice(0, 10) : null;

          if (
            existingByExternal.name === data.name &&
            existingByExternal.knownName === (data.knownName ?? null) &&
            existingByExternal.document === (data.document ?? null) &&
            existingByExternal.email === (data.email ?? null) &&
            existingByExternal.phone === (data.phone ?? null) &&
            existingByExternal.phone2 === (data.phone2 ?? null) &&
            existingBirthDateIso === nextBirthDateIso &&
            existingByExternal.city === (data.city ?? null) &&
            existingByExternal.state === (data.state ?? null) &&
            existingByExternal.route === (data.route ?? null) &&
            existingByExternal.cityId === (data.cityId ?? null) &&
            existingByExternal.stateCode === (data.stateCode ?? null) &&
            existingByExternal.neighborhood === (data.neighborhood ?? null) &&
            (existingByExternal.value ?? null) === (data.value ?? null) &&
            existingByExternal.isActive === (data.isActive ?? true) &&
            existingByExternal.classificationId === nextClassificationId
          ) {
            return existingByExternal;
          }

          return prisma.customer.update({
            where: { id: existingByExternal.id },
            data: { ...data, companyId: undefined, externalId: undefined },
          });
        }

        return prisma.customer.create({ data });
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
      const classificationId = await resolveClassificationId(existing.companyId, b.classificationId, b.classificationExternalId);
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
          route: b.route === undefined ? undefined : b.route ?? null,
          cityId: cityId === undefined ? undefined : cityId ?? null,
          stateCode: stateCode === undefined ? undefined : (stateCode ?? null),
          neighborhood: b.neighborhood === undefined ? undefined : b.neighborhood,
          value: b.value === undefined ? undefined : b.value,
          isActive: b.isActive === undefined ? undefined : b.isActive,
          classificationId: classificationId === undefined ? undefined : classificationId,
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

  app.get(
    "/classifications",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const q = parseQuery(z.object({ q: z.string().optional() }), request.query);
      const list = await prisma.customerClassification.findMany({
        where: {
          companyId,
          ...(q.q ? { name: { contains: q.q, mode: "insensitive" } } : {}),
        },
        orderBy: { name: "asc" },
      });
      return list;
    }
  );

  app.post(
    "/classifications",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const b = z.object({
        name: z.string().min(1),
        externalId: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        percentShare: z.coerce.number().optional().nullable(),
        active: z.boolean().optional(),
      }).parse(request.body);
      if (b.externalId) {
        const existingByExternal = await prisma.customerClassification.findUnique({
          where: { companyId_externalId: { companyId, externalId: b.externalId } },
        });
        const next = {
          companyId,
          externalId: b.externalId,
          name: b.name,
          description: b.description ?? null,
          notes: b.notes ?? null,
          percentShare: b.percentShare ?? null,
          active: b.active ?? true,
        };
        if (existingByExternal) {
          if (
            existingByExternal.name === next.name &&
            (existingByExternal.description ?? null) === (next.description ?? null) &&
            (existingByExternal.notes ?? null) === (next.notes ?? null) &&
            (existingByExternal.percentShare ?? null) === (next.percentShare ?? null) &&
            existingByExternal.active === next.active &&
            existingByExternal.externalId === next.externalId
          ) {
            return existingByExternal;
          }
          return prisma.customerClassification.update({
            where: { id: existingByExternal.id },
            data: { ...next, companyId: undefined, externalId: undefined },
          });
        }
        return prisma.customerClassification.create({ data: next });
      }
      return prisma.customerClassification.create({
        data: {
          companyId,
          externalId: null,
          name: b.name,
          description: b.description ?? null,
          notes: b.notes ?? null,
          percentShare: b.percentShare ?? null,
          active: b.active ?? true,
        },
      });
    }
  );

  app.patch(
    "/classifications/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const b = z.object({
        name: z.string().optional(),
        externalId: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        percentShare: z.coerce.number().optional().nullable(),
        active: z.boolean().optional(),
      }).parse(request.body);
      const existing = await prisma.customerClassification.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      const nextName = b.name === undefined ? existing.name : b.name;
      const nextExternalId = b.externalId === undefined ? existing.externalId : b.externalId;
      const nextDescription = b.description === undefined ? existing.description : b.description;
      const nextNotes = b.notes === undefined ? existing.notes : b.notes;
      const nextPercentShare = b.percentShare === undefined ? existing.percentShare : b.percentShare;
      const nextActive = b.active === undefined ? existing.active : b.active;
      if (
        existing.name === nextName &&
        (existing.externalId ?? null) === (nextExternalId ?? null) &&
        (existing.description ?? null) === (nextDescription ?? null) &&
        (existing.notes ?? null) === (nextNotes ?? null) &&
        (existing.percentShare ?? null) === (nextPercentShare ?? null) &&
        existing.active === nextActive
      ) {
        return existing;
      }
      return prisma.customerClassification.update({
        where: { id: params.id },
        data: {
          name: b.name === undefined ? undefined : b.name,
          externalId: b.externalId === undefined ? undefined : b.externalId,
          description: b.description === undefined ? undefined : b.description,
          notes: b.notes === undefined ? undefined : b.notes,
          percentShare: b.percentShare === undefined ? undefined : b.percentShare,
          active: b.active === undefined ? undefined : b.active,
        },
      });
    }
  );

  app.delete(
    "/classifications/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const existing = await prisma.customerClassification.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      await prisma.customerClassification.delete({ where: { id: params.id } });
      return { ok: true };
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
      if (b.externalId) {
        const existingByExternal = await prisma.customerDeactivationReason.findUnique({
          where: { companyId_externalId: { companyId, externalId: b.externalId } },
        });
        const next = {
          companyId,
          description: b.description,
          externalId: b.externalId,
          active: b.active ?? true,
        };
        if (existingByExternal) {
          if (
            existingByExternal.description === next.description &&
            existingByExternal.active === next.active &&
            existingByExternal.externalId === next.externalId
          ) {
            return existingByExternal;
          }
          return prisma.customerDeactivationReason.update({
            where: { id: existingByExternal.id },
            data: { description: next.description, active: next.active },
          });
        }
        return prisma.customerDeactivationReason.create({
          data: { companyId, description: next.description, externalId: next.externalId, active: next.active },
        });
      }

      const existingByDesc = await prisma.customerDeactivationReason.findFirst({
        where: { companyId, externalId: null, description: b.description },
      });
      if (existingByDesc && existingByDesc.active === (b.active ?? true)) {
        return existingByDesc;
      }
      return prisma.customerDeactivationReason.create({
        data: { companyId, description: b.description, externalId: null, active: b.active ?? true },
      });
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
      const nextDescription = b.description === undefined ? existing.description : b.description;
      const nextExternalId = b.externalId === undefined ? existing.externalId : b.externalId;
      const nextActive = b.active === undefined ? existing.active : b.active;
      if (
        existing.description === nextDescription &&
        (existing.externalId ?? null) === (nextExternalId ?? null) &&
        existing.active === nextActive
      ) {
        return existing;
      }
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
      const nextDeactivatedAt = body.deactivatedAt ? new Date(body.deactivatedAt) : new Date();
      const nextValue = body.value ?? existing.value ?? null;
      const nextReason = body.reason ?? null;
      const already = await prisma.customerDeactivation.findFirst({
        where: {
          companyId,
          customerId: existing.id,
          reasonId,
          reason: nextReason,
          value: nextValue === null ? null : nextValue,
          deactivatedAt: nextDeactivatedAt,
        },
        orderBy: { createdAt: "asc" },
      });
      const deact = already
        ? already
        : await prisma.customerDeactivation.create({
            data: {
              companyId,
              customerId: existing.id,
              value: nextValue,
              reason: nextReason,
              reasonId,
              deactivatedAt: nextDeactivatedAt,
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
