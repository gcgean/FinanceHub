import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { parseBody, parseQuery } from "../lib/validation.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { UserRole } from "@prisma/client";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  companyId: true,
  createdAt: true,
  lastLoginAt: true,
  telegramChatId: true,
  accessGroupId: true,
  accessGroup: { select: { id: true, name: true, permissions: true } },
  userCompanies: {
    select: {
      id: true,
      companyId: true,
      company: { select: { id: true, name: true, cnpj: true } },
    },
  },
} as const;

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(100),
  skip: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  companyId: z.string().optional(),
});

const CreateBody = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole).optional().default(UserRole.OPERATOR),
  companyId: z.string().optional().nullable(),   // empresa principal (compatibilidade)
  companyIds: z.array(z.string()).optional(),     // múltiplas empresas
  accessGroupId: z.string().optional().nullable(),
});

const UpdateBody = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(UserRole).optional(),
  active: z.boolean().optional(),
  companyId: z.string().optional().nullable(),
  companyIds: z.array(z.string()).optional(),
  accessGroupId: z.string().optional().nullable(),
});

export async function usersRoutes(app: FastifyInstance) {
  // GET / — listar usuários
  app.get(
    "/",
    { preHandler: [requireAuth(app)] },
    async (request) => {
      const { take, skip, q, role, companyId } = parseQuery(ListQuery, request.query);

      const where: Record<string, unknown> = {};

      // não-admin só vê usuários da sua empresa
      if (request.user.role !== UserRole.ADMIN) {
        where.OR = [
          { companyId: request.user.companyId },
          { userCompanies: { some: { companyId: request.user.companyId ?? "__none__" } } },
        ];
      }

      if (q) {
        where.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ];
      }
      if (role) where.role = role;
      if (companyId) {
        where.OR = [
          { companyId },
          { userCompanies: { some: { companyId } } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.user.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, select: userSelect }),
        prisma.user.count({ where }),
      ]);

      return { items, total, take, skip };
    }
  );

  // GET /:id — detalhe
  app.get(
    "/:id",
    { preHandler: [requireAuth(app)] },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
      if (!user) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
      return user;
    }
  );

  // POST / — criar usuário
  app.post(
    "/",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR])] },
    async (request) => {
      const body = parseBody(CreateBody, request.body);
      const passwordHash = await bcrypt.hash(body.password, 10);

      // empresa principal
      const primaryCompanyId = request.user.role === UserRole.ADMIN
        ? (body.companyId ?? null)
        : request.user.companyId ?? null;

      // lista de empresas para UserCompany
      const companyIds = body.companyIds ?? (primaryCompanyId ? [primaryCompanyId] : []);

      const created = await prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          passwordHash,
          role: body.role ?? UserRole.OPERATOR,
          companyId: primaryCompanyId,
          accessGroupId: body.accessGroupId ?? null,
          userCompanies: companyIds.length > 0
            ? { create: companyIds.map(cid => ({ companyId: cid })) }
            : undefined,
        },
        select: userSelect,
      });

      return created;
    }
  );

  // PATCH /:id — editar usuário
  app.patch(
    "/:id",
    { preHandler: [requireAuth(app)] },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const body = parseBody(UpdateBody, request.body);

      if (request.user.role !== UserRole.ADMIN && id !== request.user.sub) {
        throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
      }

      const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : undefined;

      // Se companyIds fornecido, atualiza os vínculos
      if (body.companyIds !== undefined) {
        await prisma.userCompany.deleteMany({ where: { userId: id } });
        if (body.companyIds.length > 0) {
          await prisma.userCompany.createMany({
            data: body.companyIds.map(cid => ({ userId: id, companyId: cid })),
            skipDuplicates: true,
          });
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.role && request.user.role === UserRole.ADMIN && { role: body.role }),
          ...(body.active !== undefined && { active: body.active }),
          ...(body.companyId !== undefined && { companyId: body.companyId }),
          ...(passwordHash && { passwordHash }),
          ...(body.accessGroupId !== undefined && { accessGroupId: body.accessGroupId }),
        },
        select: userSelect,
      });

      return updated;
    }
  );

  // DELETE /:id — remover usuário
  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN])] },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      await prisma.user.delete({ where: { id } });
      return { ok: true };
    }
  );
}
