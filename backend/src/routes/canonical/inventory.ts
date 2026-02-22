import type { FastifyInstance } from "fastify"
import { Prisma } from "@prisma/client"
import { prisma } from "../../lib/prisma"
import { requireAuth } from "../../lib/auth"
import { resolveCompanyId } from "../../lib/company"
import { requireCompanyScope } from "../../lib/auth"
import { parseQuery } from "../../lib/validation"
import { z } from "zod"

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
  });

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
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
}
