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
  enabled: z.boolean().optional(),
});

export async function paymentMethodsRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const query = parseQuery(ListQuery, request.query);

      const where = {
        companyId,
        ...(query.q ? { name: { contains: query.q, mode: "insensitive" as const } } : {}),
      };

      const [items, total] = await Promise.all([
        prisma.paymentMethod.findMany({
          where,
          take: query.take,
          skip: query.skip,
          orderBy: { name: "asc" },
        }),
        prisma.paymentMethod.count({ where }),
      ]);

      return { items, total, take: query.take, skip: query.skip };
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const data = parseBody(Body, request.body);

      return prisma.paymentMethod.create({
        data: {
          companyId,
          name: data.name,
          enabled: data.enabled ?? true,
        },
      });
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const data = parseBody(Body.partial(), request.body);

      const existing = await prisma.paymentMethod.findUnique({ where: { id: params.id } });
      if (!existing || existing.companyId !== companyId) {
        throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      }

      return prisma.paymentMethod.update({
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

      const existing = await prisma.paymentMethod.findUnique({ where: { id: params.id } });
      if (!existing || existing.companyId !== companyId) {
        throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      }

      // Check if used
      const count = await prisma.sale.count({ where: { paymentMethodId: params.id } });
      if (count > 0) {
        throw Object.assign(new Error("CANNOT_DELETE_IN_USE"), { statusCode: 400 });
      }

      await prisma.paymentMethod.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}
