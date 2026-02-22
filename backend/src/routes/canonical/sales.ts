import { Prisma } from "@prisma/client";
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

const SaleItemBody = z.object({
  id: z.string().optional(),
  productId: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
});

const Body = z.object({
  customerId: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
  date: z.string().datetime().or(z.string()),
  status: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  items: z.array(SaleItemBody).optional(),
});

export async function salesRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const query = parseQuery(ListQuery, request.query);

      const where: Prisma.SaleWhereInput = {
        companyId,
      };

      if (query.q) {
        where.OR = [
            { customer: { name: { contains: query.q, mode: "insensitive" } } },
            { status: { contains: query.q, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.sale.findMany({
          where,
          take: query.take,
          skip: query.skip,
          orderBy: { date: "desc" },
          include: { customer: true, paymentMethod: true, items: true },
        }),
        prisma.sale.count({ where }),
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

      const items = data.items ?? [];
      const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      const saleData = {
        companyId,
        customerId: data.customerId,
        externalId: data.externalId ?? null,
        date: new Date(data.date),
        total,
        status: data.status,
        paymentMethodId: data.paymentMethodId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      };

      if (data.externalId) {
        // For sales upsert, updating items is tricky.
        // Simple approach: Delete existing items and recreate them.
        // Prisma upsert 'update' doesn't support 'deleteMany' inside nested relations directly in a clean way without separate query usually.
        // But we can use transaction or just update scalar fields and handle items separately.
        // Let's use transaction for safety.
        return prisma.$transaction(async (tx) => {
          const existing = await tx.sale.findUnique({
            where: { companyId_externalId: { companyId, externalId: data.externalId! } },
          });

          if (existing) {
            // Delete old items
            await tx.saleItem.deleteMany({ where: { saleId: existing.id } });
            // Update sale and create new items
            return tx.sale.update({
              where: { id: existing.id },
              data: {
                customerId: data.customerId,
                date: new Date(data.date),
                total,
                status: data.status,
                paymentMethodId: data.paymentMethodId,
                items: {
                  create: items.map((item) => ({
                    productId: item.productId,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.quantity * item.unitPrice,
                  })),
                },
              },
              include: { items: true },
            });
          } else {
            return tx.sale.create({
              data: saleData,
              include: { items: true },
            });
          }
        });
      }

      return prisma.sale.create({
        data: saleData,
        include: { items: true },
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

      const existing = await prisma.sale.findUnique({ where: { id: params.id }, include: { items: true } });
      if (!existing || existing.companyId !== companyId) {
        throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      }

      // If items are provided, we need to handle updates/creates/deletes
      // For simplicity, we'll delete all existing items and recreate them if items are provided
      // Ideally, we should diff them.
      
      let itemsUpdate = {};
      let total = existing.total;

      if (data.items) {
        // Calculate new total
        total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        
        itemsUpdate = {
            items: {
                deleteMany: {},
                create: data.items.map((item) => ({
                    productId: item.productId,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.quantity * item.unitPrice,
                })),
            }
        };
      } else if (data.date || data.customerId || data.status || data.paymentMethodId) {
        // Just updating header fields
      }

      return prisma.sale.update({
        where: { id: params.id },
        data: {
          customerId: data.customerId,
          date: data.date ? new Date(data.date) : undefined,
          status: data.status,
          paymentMethodId: data.paymentMethodId,
          total: data.items ? total : undefined,
          ...itemsUpdate,
        },
        include: { items: true },
      });
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);

      const existing = await prisma.sale.findUnique({ where: { id: params.id } });
      if (!existing || existing.companyId !== companyId) {
        throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      }

      await prisma.sale.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}
