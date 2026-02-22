import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { parseQuery } from "../../lib/validation";
import { requireAuth, requireCompanyScope } from "../../lib/auth";
import { resolveCompanyId } from "../../lib/company";

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().optional(),
});

export async function saleItemsRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const query = parseQuery(ListQuery, request.query);

      const where: Prisma.SaleItemWhereInput = {
        sale: { companyId },
      };

      if (query.q) {
        where.description = { contains: query.q, mode: "insensitive" };
      }

      const [items, total] = await Promise.all([
        prisma.saleItem.findMany({
          where,
          take: query.take,
          skip: query.skip,
          orderBy: { createdAt: "desc" },
          include: { sale: { include: { customer: true } }, product: true },
        }),
        prisma.saleItem.count({ where }),
      ]);

      return { items, total, take: query.take, skip: query.skip };
    }
  );
}
