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

const SimpleQuery = z.object({
  q: z.string().optional(),
});

const SectionBody = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
});

const GroupBody = z.object({
  sectionId: z.string().min(1).optional(),
  sectionCode: z.string().min(1).optional(),
  sectionName: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  name: z.string().min(1),
});

const SubgroupBody = z.object({
  groupId: z.string().min(1).optional(),
  groupCode: z.string().min(1).optional(),
  groupName: z.string().min(1).optional(),
  sectionId: z.string().min(1).optional(),
  sectionCode: z.string().min(1).optional(),
  sectionName: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  name: z.string().min(1),
});

const ManufacturerBody = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
});

const nextCodeFrom = (existing: Array<{ code: string }>, pad: number) => {
  const numeric = existing.map((x) => Number.parseInt(x.code, 10)).filter((n) => Number.isFinite(n));
  const next = (numeric.length ? Math.max(...numeric) : 0) + 1;
  return String(next).padStart(pad, "0");
};

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

  app.get(
    "/sections",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { q } = parseQuery(SimpleQuery, request.query);
      const companyId = await resolveCompanyId(request);
      const where: Prisma.ProductSectionWhereInput = {
        companyId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      return prisma.productSection.findMany({ where, orderBy: { code: "asc" } });
    }
  );

  app.post(
    "/sections",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const data = parseBody(SectionBody, request.body);
      const inputCode = data.code?.trim() || "";
      const existing = inputCode
        ? await prisma.productSection.findFirst({ where: { companyId, code: inputCode } })
        : await prisma.productSection.findFirst({
            where: { companyId, name: { equals: data.name, mode: "insensitive" } },
          });
      if (existing) {
        try {
          return await prisma.productSection.update({
            where: { id: existing.id },
            data: {
              code: inputCode ? inputCode : undefined,
              name: data.name,
            },
          });
        } catch (e: unknown) {
          const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
          if (errCode === "P2002") throw Object.assign(new Error("SECTION_CODE_EXISTS"), { statusCode: 409 });
          throw e;
        }
      }
      const code = inputCode
        ? inputCode
        : nextCodeFrom(await prisma.productSection.findMany({ where: { companyId }, select: { code: true } }), 2);
      try {
        return await prisma.productSection.create({
          data: {
            companyId,
            code,
            name: data.name,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("SECTION_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }
    }
  );

  app.patch(
    "/sections/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const companyId = await resolveCompanyId(request);
      const data = parseBody(SectionBody.partial(), request.body);
      const existing = await prisma.productSection.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      try {
        return await prisma.productSection.update({
          where: { id: params.id },
          data: {
            code: data.code === undefined ? undefined : data.code,
            name: data.name === undefined ? undefined : data.name,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("SECTION_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }
    }
  );

  app.delete(
    "/sections/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const companyId = await resolveCompanyId(request);
      const existing = await prisma.productSection.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      const inUse = await prisma.productGroup.count({ where: { sectionId: params.id } });
      if (inUse > 0) throw Object.assign(new Error("CANNOT_DELETE_IN_USE"), { statusCode: 400 });
      await prisma.productSection.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );

  app.get(
    "/groups",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { q } = parseQuery(SimpleQuery, request.query);
      const companyId = await resolveCompanyId(request);
      const where: Prisma.ProductGroupWhereInput = {
        companyId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      return prisma.productGroup.findMany({ where, orderBy: { code: "asc" } });
    }
  );

  app.post(
    "/groups",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const data = parseBody(GroupBody, request.body);
      const sectionId =
        data.sectionId ||
        (data.sectionCode
          ? (await prisma.productSection.findFirst({
              where: { companyId, code: data.sectionCode },
              select: { id: true },
            }))?.id
          : data.sectionName
            ? (await prisma.productSection.findFirst({
                where: { companyId, name: { equals: data.sectionName, mode: "insensitive" } },
                select: { id: true },
              }))?.id
            : undefined);
      if (!sectionId) throw Object.assign(new Error("SECTION_REQUIRED"), { statusCode: 400 });
      const section = await prisma.productSection.findUnique({ where: { id: sectionId } });
      if (!section) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (section.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      const inputCode = data.code?.trim() || "";
      const existing = inputCode
        ? await prisma.productGroup.findFirst({ where: { sectionId, code: inputCode } })
        : await prisma.productGroup.findFirst({
            where: { sectionId, name: { equals: data.name, mode: "insensitive" } },
          });
      if (existing) {
        try {
          return await prisma.productGroup.update({
            where: { id: existing.id },
            data: {
              sectionId,
              code: inputCode ? inputCode : undefined,
              name: data.name,
            },
          });
        } catch (e: unknown) {
          const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
          if (errCode === "P2002") throw Object.assign(new Error("GROUP_CODE_EXISTS"), { statusCode: 409 });
          throw e;
        }
      }
      const code = inputCode
        ? inputCode
        : nextCodeFrom(await prisma.productGroup.findMany({ where: { sectionId }, select: { code: true } }), 2);
      try {
        return await prisma.productGroup.create({
          data: {
            companyId,
            sectionId,
            code,
            name: data.name,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("GROUP_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }
    }
  );

  app.patch(
    "/groups/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const companyId = await resolveCompanyId(request);
      const data = parseBody(GroupBody.partial(), request.body);
      const existing = await prisma.productGroup.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      if (data.sectionId) {
        const section = await prisma.productSection.findUnique({ where: { id: data.sectionId } });
        if (!section) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
        if (section.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      try {
        return await prisma.productGroup.update({
          where: { id: params.id },
          data: {
            sectionId: data.sectionId === undefined ? undefined : data.sectionId,
            code: data.code === undefined ? undefined : data.code,
            name: data.name === undefined ? undefined : data.name,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("GROUP_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }
    }
  );

  app.delete(
    "/groups/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const companyId = await resolveCompanyId(request);
      const existing = await prisma.productGroup.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      const inUse = await prisma.productSubgroup.count({ where: { groupId: params.id } });
      if (inUse > 0) throw Object.assign(new Error("CANNOT_DELETE_IN_USE"), { statusCode: 400 });
      await prisma.productGroup.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );

  app.get(
    "/subgroups",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { q } = parseQuery(SimpleQuery, request.query);
      const companyId = await resolveCompanyId(request);
      const where: Prisma.ProductSubgroupWhereInput = {
        companyId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      return prisma.productSubgroup.findMany({ where, orderBy: { code: "asc" } });
    }
  );

  app.post(
    "/subgroups",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const data = parseBody(SubgroupBody, request.body);
      const sectionId =
        data.sectionId ||
        (data.sectionCode
          ? (await prisma.productSection.findFirst({
              where: { companyId, code: data.sectionCode },
              select: { id: true },
            }))?.id
          : data.sectionName
            ? (await prisma.productSection.findFirst({
                where: { companyId, name: { equals: data.sectionName, mode: "insensitive" } },
                select: { id: true },
              }))?.id
            : undefined);
      let groupId = data.groupId;
      if (!groupId) {
        const baseWhere: Prisma.ProductGroupWhereInput = {
          companyId,
          ...(sectionId ? { sectionId } : {}),
        };
        if (data.groupCode) {
          const matches = await prisma.productGroup.findMany({
            where: { ...baseWhere, code: data.groupCode },
            select: { id: true },
          });
          if (matches.length === 1) groupId = matches[0].id;
          if (matches.length > 1) throw Object.assign(new Error("GROUP_AMBIGUOUS"), { statusCode: 400 });
        } else if (data.groupName) {
          const matches = await prisma.productGroup.findMany({
            where: { ...baseWhere, name: { equals: data.groupName, mode: "insensitive" } },
            select: { id: true },
          });
          if (matches.length === 1) groupId = matches[0].id;
          if (matches.length > 1) throw Object.assign(new Error("GROUP_AMBIGUOUS"), { statusCode: 400 });
        }
      }
      if (!groupId) throw Object.assign(new Error("GROUP_REQUIRED"), { statusCode: 400 });
      const group = await prisma.productGroup.findUnique({ where: { id: groupId } });
      if (!group) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (group.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      const inputCode = data.code?.trim() || "";
      const existing = inputCode
        ? await prisma.productSubgroup.findFirst({ where: { groupId, code: inputCode } })
        : await prisma.productSubgroup.findFirst({
            where: { groupId, name: { equals: data.name, mode: "insensitive" } },
          });
      if (existing) {
        try {
          return await prisma.productSubgroup.update({
            where: { id: existing.id },
            data: {
              groupId,
              code: inputCode ? inputCode : undefined,
              name: data.name,
            },
          });
        } catch (e: unknown) {
          const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
          if (errCode === "P2002") throw Object.assign(new Error("SUBGROUP_CODE_EXISTS"), { statusCode: 409 });
          throw e;
        }
      }
      const code = inputCode
        ? inputCode
        : nextCodeFrom(await prisma.productSubgroup.findMany({ where: { groupId }, select: { code: true } }), 2);
      try {
        return await prisma.productSubgroup.create({
          data: {
            companyId,
            groupId,
            code,
            name: data.name,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("SUBGROUP_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }
    }
  );

  app.patch(
    "/subgroups/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const companyId = await resolveCompanyId(request);
      const data = parseBody(SubgroupBody.partial(), request.body);
      const existing = await prisma.productSubgroup.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      if (data.groupId) {
        const group = await prisma.productGroup.findUnique({ where: { id: data.groupId } });
        if (!group) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
        if (group.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      try {
        return await prisma.productSubgroup.update({
          where: { id: params.id },
          data: {
            groupId: data.groupId === undefined ? undefined : data.groupId,
            code: data.code === undefined ? undefined : data.code,
            name: data.name === undefined ? undefined : data.name,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("SUBGROUP_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }
    }
  );

  app.delete(
    "/subgroups/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const companyId = await resolveCompanyId(request);
      const existing = await prisma.productSubgroup.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      await prisma.productSubgroup.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );

  app.get(
    "/manufacturers",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { q } = parseQuery(SimpleQuery, request.query);
      const companyId = await resolveCompanyId(request);
      const where: Prisma.ProductManufacturerWhereInput = {
        companyId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      return prisma.productManufacturer.findMany({ where, orderBy: { code: "asc" } });
    }
  );

  app.post(
    "/manufacturers",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const data = parseBody(ManufacturerBody, request.body);
      const inputCode = data.code?.trim() || "";
      const existing = inputCode
        ? await prisma.productManufacturer.findFirst({ where: { companyId, code: inputCode } })
        : await prisma.productManufacturer.findFirst({
            where: { companyId, name: { equals: data.name, mode: "insensitive" } },
          });
      if (existing) {
        try {
          return await prisma.productManufacturer.update({
            where: { id: existing.id },
            data: {
              code: inputCode ? inputCode : undefined,
              name: data.name,
            },
          });
        } catch (e: unknown) {
          const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
          if (errCode === "P2002") throw Object.assign(new Error("MANUFACTURER_CODE_EXISTS"), { statusCode: 409 });
          throw e;
        }
      }
      const code = inputCode
        ? inputCode
        : nextCodeFrom(await prisma.productManufacturer.findMany({ where: { companyId }, select: { code: true } }), 2);
      try {
        return await prisma.productManufacturer.create({
          data: {
            companyId,
            code,
            name: data.name,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "P2002") throw Object.assign(new Error("MANUFACTURER_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }
    }
  );

  app.patch(
    "/manufacturers/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const companyId = await resolveCompanyId(request);
      const data = parseBody(ManufacturerBody.partial(), request.body);
      const existing = await prisma.productManufacturer.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      try {
        return await prisma.productManufacturer.update({
          where: { id: params.id },
          data: {
            code: data.code === undefined ? undefined : data.code,
            name: data.name === undefined ? undefined : data.name,
          },
        });
      } catch (e: unknown) {
        const errCode = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;
        if (errCode === "MANUFACTURER_CODE_EXISTS") throw Object.assign(new Error("MANUFACTURER_CODE_EXISTS"), { statusCode: 409 });
        if (errCode === "P2002") throw Object.assign(new Error("MANUFACTURER_CODE_EXISTS"), { statusCode: 409 });
        throw e;
      }
    }
  );

  app.delete(
    "/manufacturers/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const companyId = await resolveCompanyId(request);
      const existing = await prisma.productManufacturer.findUnique({ where: { id: params.id } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (existing.companyId !== companyId) throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      await prisma.productManufacturer.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}
