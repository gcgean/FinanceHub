import type { FastifyInstance } from "fastify"
import { Prisma } from "@prisma/client"
import { prisma } from "../../lib/prisma.js"
import { requireAuth, requireRole } from "../../lib/auth.js"
import { resolveCompanyId } from "../../lib/company.js"
import { requireCompanyScope } from "../../lib/auth.js"
import { parseQuery } from "../../lib/validation.js"
import { z } from "zod"
import { UserRole } from "@prisma/client"

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().optional(),
  externalLocationId: z.string().optional(),
  locationName: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export async function inventoryRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const { take, skip, q, externalLocationId, locationName, dateFrom, dateTo } = parseQuery(ListQuery, request.query);
      const where: Prisma.StgInventoryWhereInput = {
        companyId,
        ...(q
          ? {
              OR: [
                { externalProductId: { contains: q, mode: "insensitive" } },
                { locationName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(externalLocationId ? { externalLocationId } : {}),
        ...(locationName ? { locationName: { contains: locationName, mode: "insensitive" } } : {}),
        ...(dateFrom || dateTo
          ? {
              updatedAtSource: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      };
      const [rawItems, total] = await Promise.all([
        prisma.stgInventory.findMany({ where, take, skip, orderBy: { updatedAtSource: "desc" } }),
        prisma.stgInventory.count({ where }),
      ]);
      const externalIds = Array.from(new Set(rawItems.map((i) => i.externalProductId).filter(Boolean)));
      const products = await prisma.product.findMany({
        where: { companyId, externalId: { in: externalIds } },
        select: { externalId: true, name: true },
      });
      const byExt: Record<string, string> = {};
      for (const p of products) if (p.externalId) byExt[p.externalId] = p.name;
      const items = rawItems.map((i) => ({ ...i, productName: byExt[i.externalProductId] ?? null }));
      return { items, total, take, skip };
    }
  );

  const ItemSchema = z.object({
    externalProductId: z.string().min(1),
    externalLocationId: z.string().optional().nullable(),
    locationName: z.string().optional().nullable(),
    qtyOnHand: z.number(),
    updatedAtSource: z.string().optional().nullable(),
  ead: z.string().optional().nullable(),
  deactivated: z.boolean().optional(),
  });

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const body = z
        .object({ items: z.array(ItemSchema) })
        .or(ItemSchema)
        .parse(request.body);

      const items = Array.isArray((body as { items?: z.infer<typeof ItemSchema>[] }).items)
        ? (body as { items: z.infer<typeof ItemSchema>[] }).items
        : [body as z.infer<typeof ItemSchema>];

      const results: { created: number; updated: number } = { created: 0, updated: 0 };
      for (const it of items) {
        const existing = await prisma.stgInventory.findFirst({
          where: {
            companyId,
            externalProductId: it.externalProductId,
            externalLocationId: it.externalLocationId ?? null,
          },
        });
        const data = {
          companyId,
          externalProductId: it.externalProductId,
          externalLocationId: it.externalLocationId ?? null,
          locationName: it.locationName ?? null,
          qtyOnHand: it.qtyOnHand,
          ead: it.ead ?? null,
          deactivated: it.deactivated ?? false,
          updatedAtSource: it.updatedAtSource ? new Date(it.updatedAtSource) : null,
          dataSourceId: "MANUAL",
          importJobId: "MANUAL",
          rawEventId: "MANUAL",
        };
        if (existing) {
          await prisma.stgInventory.update({ where: { id: existing.id }, data });
          results.updated++;
        } else {
          await prisma.stgInventory.create({ data });
          results.created++;
        }
      }
      return { ok: true, ...results };
    }
  );

  const LocationListQuery = z.object({
    take: z.coerce.number().int().min(1).max(200).optional().default(50),
    skip: z.coerce.number().int().min(0).optional().default(0),
    q: z.string().optional(),
  });

  const LocationSchema = z.object({
    externalId: z.string().optional().nullable(),
    name: z.string().min(1),
    hashTable: z.string().optional().nullable(),
    updatedAtSource: z.string().optional().nullable(),
    ignoreConsolidation: z.boolean().optional().default(false),
  });

  app.get(
    "/locations",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const { take, skip, q } = parseQuery(LocationListQuery, request.query);
      const where: Prisma.InventoryLocationWhereInput = {
        companyId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { externalId: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        prisma.inventoryLocation.findMany({ where, take, skip, orderBy: { name: "asc" } }),
        prisma.inventoryLocation.count({ where }),
      ]);
      return { items, total, take, skip };
    }
  );

  app.post(
    "/locations",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const body = z
        .object({ items: z.array(LocationSchema) })
        .or(LocationSchema)
        .parse(request.body);

      const items = Array.isArray((body as { items?: z.infer<typeof LocationSchema>[] }).items)
        ? (body as { items: z.infer<typeof LocationSchema>[] }).items
        : [body as z.infer<typeof LocationSchema>];

      const results: { created: number; updated: number } = { created: 0, updated: 0 };
      for (const it of items) {
        const externalId = it.externalId ?? null;
        const existing = externalId
          ? await prisma.inventoryLocation.findFirst({ where: { companyId, externalId } })
          : await prisma.inventoryLocation.findFirst({ where: { companyId, externalId: null, name: it.name } });
        const data = {
          companyId,
          externalId,
          name: it.name,
          hashTable: it.hashTable ?? null,
          updatedAtSource: it.updatedAtSource ? new Date(it.updatedAtSource) : null,
          ignoreConsolidation: it.ignoreConsolidation ?? false,
        };
        if (existing) {
          await prisma.inventoryLocation.update({ where: { id: existing.id }, data });
          results.updated++;
        } else {
          await prisma.inventoryLocation.create({ data });
          results.created++;
        }
      }
      return { ok: true, ...results };
    }
  );

  app.patch(
    "/locations/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = LocationSchema.partial().parse(request.body);
      const existing = await prisma.inventoryLocation.findFirst({ where: { id: params.id, companyId } });
      if (!existing) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      return prisma.inventoryLocation.update({
        where: { id: params.id },
        data: {
          externalId: body.externalId ?? existing.externalId,
          name: body.name ?? existing.name,
          hashTable: body.hashTable ?? existing.hashTable,
          updatedAtSource: body.updatedAtSource ? new Date(body.updatedAtSource) : existing.updatedAtSource,
          ignoreConsolidation: body.ignoreConsolidation ?? existing.ignoreConsolidation,
        },
      });
    }
  );
}
