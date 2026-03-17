import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { parseBody, parseQuery } from "../../lib/validation";
import { requireAuth, requireCompanyScope } from "../../lib/auth";
import { resolveCompanyId } from "../../lib/company";

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().optional(),
});

const Body = z.object({
  name: z.string().min(1),
  externalId: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function sellersRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const query = parseQuery(ListQuery, request.query);

      const where = {
        companyId,
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: "insensitive" as const } },
                { externalId: { contains: query.q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        prisma.seller.findMany({
          where,
          take: query.take,
          skip: query.skip,
          orderBy: { name: "asc" },
        }),
        prisma.seller.count({ where }),
      ]);

      return { items, total, take: query.take, skip: query.skip };
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const body = parseBody(z.object({ items: z.array(Body) }).or(Body), request.body);

      const items = Array.isArray((body as { items?: z.infer<typeof Body>[] }).items)
        ? (body as { items: z.infer<typeof Body>[] }).items
        : [body as z.infer<typeof Body>];

      if (items.length === 1 && !("items" in (body as object))) {
        const data = items[0];
        const externalId = data.externalId ?? null;
        const existing = externalId
          ? await prisma.seller.findFirst({ where: { companyId, externalId } })
          : await prisma.seller.findFirst({ where: { companyId, name: data.name } });

        if (existing) {
          return prisma.seller.update({
            where: { id: existing.id },
            data: {
              name: data.name,
              externalId,
              active: data.active ?? existing.active,
            },
          });
        }

        return prisma.seller.create({
          data: {
            companyId,
            name: data.name,
            externalId,
            active: data.active ?? true,
          },
        });
      }

      const results: { created: number; updated: number } = { created: 0, updated: 0 };
      for (const data of items) {
        const externalId = data.externalId ?? null;
        const existing = externalId
          ? await prisma.seller.findFirst({ where: { companyId, externalId } })
          : await prisma.seller.findFirst({ where: { companyId, name: data.name } });

        if (existing) {
          await prisma.seller.update({
            where: { id: existing.id },
            data: {
              name: data.name,
              externalId,
              active: data.active ?? existing.active,
            },
          });
          results.updated++;
        } else {
          await prisma.seller.create({
            data: {
              companyId,
              name: data.name,
              externalId,
              active: data.active ?? true,
            },
          });
          results.created++;
        }
      }

      return { ok: true, ...results };
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const data = parseBody(Body.partial(), request.body);

      const existing = await prisma.seller.findUnique({ where: { id: params.id } });
      if (!existing || existing.companyId !== companyId) {
        throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      }

      return prisma.seller.update({
        where: { id: params.id },
        data,
      });
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);

      const existing = await prisma.seller.findUnique({ where: { id: params.id } });
      if (!existing || existing.companyId !== companyId) {
        throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      }

      const count = await prisma.sale.count({ where: { sellerId: params.id } });
      if (count > 0) {
        throw Object.assign(new Error("CANNOT_DELETE_IN_USE"), { statusCode: 400 });
      }

      await prisma.seller.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}
