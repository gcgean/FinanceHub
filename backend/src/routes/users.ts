import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { parseBody, parseQuery } from "../lib/validation";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { UserRole } from "@prisma/client";

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
});

const CreateBody = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
  companyId: z.string().optional().nullable(),
});

export async function usersRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app)] },
    async (request) => {
      const { take, skip } = parseQuery(ListQuery, request.query);
      const where = request.user.role === UserRole.ADMIN ? {} : { companyId: request.user.companyId ?? "__none__" };
      const [items, total] = await Promise.all([
        prisma.user.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, select: { id: true, email: true, name: true, role: true, companyId: true, createdAt: true } }),
        prisma.user.count({ where }),
      ]);
      return { items, total, take, skip };
    }
  );

  app.get(
    "/:id",
    { preHandler: [requireAuth(app)] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      if (request.user.role !== UserRole.ADMIN && params.id !== request.user.sub) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true, name: true, role: true, companyId: true, createdAt: true } });
      if (!user) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && user.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      return user;
    }
  );

  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const body = parseBody(CreateBody, request.body);
      const passwordHash = await bcrypt.hash(body.password, 10);
      const companyId = request.user.role === UserRole.ADMIN ? (body.companyId ?? null) : request.user.companyId;
      const created = await prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          passwordHash,
          role: body.role,
          companyId,
        },
        select: { id: true, email: true, name: true, role: true, companyId: true, createdAt: true },
      });
      return created;
    }
  );

  app.patch(
    "/:id",
    { preHandler: [requireAuth(app)] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const Body = z.object({ name: z.string().min(1).optional(), password: z.string().min(8).optional(), role: z.nativeEnum(UserRole).optional() });
      const body = parseBody(Body, request.body);

      if (request.user.role !== UserRole.ADMIN && params.id !== request.user.sub) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }

      const target = await prisma.user.findUnique({ where: { id: params.id } });
      if (!target) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      if (request.user.role !== UserRole.ADMIN && target.companyId !== request.user.companyId) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }
      if (body.role && request.user.role !== UserRole.ADMIN) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }

      const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : undefined;
      const updated = await prisma.user.update({
        where: { id: params.id },
        data: {
          name: body.name,
          role: body.role,
          passwordHash,
        },
        select: { id: true, email: true, name: true, role: true, companyId: true, createdAt: true },
      });
      return updated;
    }
  );

  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN])] },
    async (request) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      await prisma.user.delete({ where: { id: params.id } });
      return { ok: true };
    }
  );
}

