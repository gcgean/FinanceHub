import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { parseBody, parseQuery } from "../../lib/validation.js";
import { requireAuth, requireCompanyScope } from "../../lib/auth.js";
import { resolveCompanyId } from "../../lib/company.js";

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().optional(),
});

const SaleItemBody = z.object({
  id: z.string().optional(),
  productId: z.string().optional().nullable(),
  productExternalId: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
});

const SalePaymentBody = z.object({
  paymentMethodId: z.string().optional().nullable(),
  paymentMethodExternalId: z.string().optional().nullable(),
  paymentMethodName: z.string().optional().nullable(),
  amount: z.number().min(0),
});

const Body = z.object({
  customerId: z.string().optional().nullable(),
  customerExternalId: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
  date: z.string().datetime().or(z.string()),
  status: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  paymentMethodExternalId: z.string().optional().nullable(),
  sellerId: z.string().optional().nullable(),
  sellerExternalId: z.string().optional().nullable(),
  sellerName: z.string().optional().nullable(),
  cashierId: z.string().optional().nullable(),
  cashierExternalId: z.string().optional().nullable(),
  cashierName: z.string().optional().nullable(),
  items: z.array(SaleItemBody).optional(),
  payments: z.array(SalePaymentBody).optional(),
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
          include: { customer: true, paymentMethod: true, items: true, seller: true, cashier: true, payments: { include: { paymentMethod: true } } },
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

      const resolveCustomerId = async () => {
        if (data.customerId) return data.customerId;
        if (!data.customerExternalId) return null;
        const customer = await prisma.customer.findFirst({
          where: { companyId, externalId: data.customerExternalId },
          select: { id: true },
        });
        return customer?.id ?? null;
      };

      const resolveSellerId = async () => {
        if (data.sellerId) return data.sellerId;
        if (!data.sellerExternalId) return null;
        const existing = await prisma.seller.findFirst({
          where: { companyId, externalId: data.sellerExternalId },
        });
        if (existing) return existing.id;
        const created = await prisma.seller.create({
          data: {
            companyId,
            externalId: data.sellerExternalId,
            name: data.sellerName ?? data.sellerExternalId,
            active: true,
          },
        });
        return created.id;
      };

      const resolveCashierId = async () => {
        if (data.cashierId) return data.cashierId;
        if (!data.cashierExternalId) return null;
        const existing = await prisma.cashier.findFirst({
          where: { companyId, externalId: data.cashierExternalId },
        });
        if (existing) return existing.id;
        const created = await prisma.cashier.create({
          data: {
            companyId,
            externalId: data.cashierExternalId,
            name: data.cashierName ?? data.cashierExternalId,
            active: true,
          },
        });
        return created.id;
      };

      const resolvePaymentMethodId = async () => {
        if (data.paymentMethodId) return data.paymentMethodId;
        if (!data.paymentMethodExternalId) return null;
        const existing = await prisma.paymentMethod.findFirst({
          where: { companyId, externalId: data.paymentMethodExternalId },
        });
        if (existing) return existing.id;
        const created = await prisma.paymentMethod.create({
          data: {
            companyId,
            externalId: data.paymentMethodExternalId,
            name: data.paymentMethodExternalId,
            enabled: true,
          },
        });
        return created.id;
      };

      const items = data.items ?? [];
      const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const payments = data.payments ?? [];
      const customerId = await resolveCustomerId();
      const sellerId = await resolveSellerId();
      const cashierId = await resolveCashierId();
      const paymentMethodId = await resolvePaymentMethodId();

      const resolveProductId = async (item: z.infer<typeof SaleItemBody>) => {
        if (item.productId) return item.productId;
        if (!item.productExternalId) return null;
        const product = await prisma.product.findFirst({
          where: { companyId, externalId: item.productExternalId },
          select: { id: true },
        });
        return product?.id ?? null;
      };

      const saleData = {
        companyId,
        customerId,
        externalId: data.externalId ?? null,
        date: new Date(data.date),
        total,
        status: data.status,
        paymentMethodId,
        sellerId,
        cashierId,
        items: {
          create: await Promise.all(
            items.map(async (item) => ({
              productId: await resolveProductId(item),
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              externalId: item.id ?? null,
            }))
          ),
        },
        payments: {
          create: await Promise.all(
            payments.map(async (payment) => {
              let paymentMethodIdResolved = payment.paymentMethodId ?? null;
              if (!paymentMethodIdResolved && payment.paymentMethodExternalId) {
                const existing = await prisma.paymentMethod.findFirst({
                  where: { companyId, externalId: payment.paymentMethodExternalId },
                });
                if (existing) {
                  paymentMethodIdResolved = existing.id;
                } else {
                  const created = await prisma.paymentMethod.create({
                    data: {
                      companyId,
                      externalId: payment.paymentMethodExternalId,
                      name: payment.paymentMethodName ?? payment.paymentMethodExternalId,
                      enabled: true,
                    },
                  });
                  paymentMethodIdResolved = created.id;
                }
              }
              return {
                paymentMethodId: paymentMethodIdResolved,
                externalPaymentMethodId: payment.paymentMethodExternalId ?? null,
                amount: payment.amount,
              };
            })
          ),
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
            await tx.salePayment.deleteMany({ where: { saleId: existing.id } });
            // Update sale and create new items
            return tx.sale.update({
              where: { id: existing.id },
              data: {
                customerId,
                date: new Date(data.date),
                total,
                status: data.status,
                paymentMethodId,
                sellerId,
                cashierId,
                items: saleData.items,
                payments: saleData.payments,
              },
              include: { items: true, payments: { include: { paymentMethod: true } } },
            });
          } else {
            return tx.sale.create({
              data: saleData,
              include: { items: true, payments: { include: { paymentMethod: true } } },
            });
          }
        });
      }

      return prisma.sale.create({
        data: saleData,
        include: { items: true, payments: { include: { paymentMethod: true } } },
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

      const existing = await prisma.sale.findUnique({ where: { id: params.id }, include: { items: true, payments: true } });
      if (!existing || existing.companyId !== companyId) {
        throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      }

      // If items are provided, we need to handle updates/creates/deletes
      // For simplicity, we'll delete all existing items and recreate them if items are provided
      // Ideally, we should diff them.
      
      let itemsUpdate = {};
      let total = existing.total;

      let paymentsUpdate = {};
      if (data.items) {
        const resolveProductId = async (item: z.infer<typeof SaleItemBody>) => {
          if (item.productId) return item.productId;
          if (!item.productExternalId) return null;
          const product = await prisma.product.findFirst({
            where: { companyId, externalId: item.productExternalId },
            select: { id: true },
          });
          return product?.id ?? null;
        };

        // Calculate new total
        total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        
        itemsUpdate = {
            items: {
                deleteMany: {},
                create: await Promise.all(
                  data.items.map(async (item) => ({
                    productId: await resolveProductId(item),
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.quantity * item.unitPrice,
                    externalId: item.id ?? null,
                  }))
                ),
            }
        };
      }

      if (data.payments) {
        paymentsUpdate = {
          payments: {
            deleteMany: {},
            create: await Promise.all(
              data.payments.map(async (payment) => {
                let paymentMethodIdResolved = payment.paymentMethodId ?? null;
                if (!paymentMethodIdResolved && payment.paymentMethodExternalId) {
                  const existingPm = await prisma.paymentMethod.findFirst({
                    where: { companyId, externalId: payment.paymentMethodExternalId },
                  });
                  if (existingPm) {
                    paymentMethodIdResolved = existingPm.id;
                  } else {
                    const created = await prisma.paymentMethod.create({
                      data: {
                        companyId,
                        externalId: payment.paymentMethodExternalId,
                        name: payment.paymentMethodName ?? payment.paymentMethodExternalId,
                        enabled: true,
                      },
                    });
                    paymentMethodIdResolved = created.id;
                  }
                }
                return {
                  paymentMethodId: paymentMethodIdResolved,
                  externalPaymentMethodId: payment.paymentMethodExternalId ?? null,
                  amount: payment.amount,
                };
              })
            ),
          },
        };
      } else if (data.date || data.customerId || data.status || data.paymentMethodId) {
        // Just updating header fields
      }

      return prisma.sale.update({
        where: { id: params.id },
        data: {
          customerId: data.customerId,
          sellerId: data.sellerId,
          cashierId: data.cashierId,
          date: data.date ? new Date(data.date) : undefined,
          status: data.status,
          paymentMethodId: data.paymentMethodId,
          total: data.items ? total : undefined,
          ...itemsUpdate,
          ...paymentsUpdate,
        },
        include: { items: true, payments: { include: { paymentMethod: true } } },
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
