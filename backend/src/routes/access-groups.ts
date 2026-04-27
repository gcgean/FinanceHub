import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth.js";
import { resolveCompanyId } from "../lib/company.js";
import { UserRole } from "@prisma/client";

const Body = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional().default([]),
});

export async function accessGroupsRoutes(app: FastifyInstance) {
  // GET / — listar grupos da empresa
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const groups = await prisma.accessGroup.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
        include: {
          _count: { select: { users: true } },
        },
      });
      return groups;
    }
  );

  // POST / — criar grupo
  app.post(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope(), requireRole([UserRole.ADMIN, UserRole.OPERATOR])] },
    async (request) => {
      const companyId = await resolveCompanyId(request);
      const { name, description, permissions } = Body.parse(request.body);
      return prisma.accessGroup.create({
        data: { companyId, name, description, permissions: permissions ?? [] },
      });
    }
  );

  // PUT /:id — atualizar grupo
  app.put(
    "/:id",
    { preHandler: [requireAuth(app), requireCompanyScope(), requireRole([UserRole.ADMIN, UserRole.OPERATOR])] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const { name, description, permissions } = Body.parse(request.body);
      const existing = await prisma.accessGroup.findFirst({ where: { id, companyId } });
      if (!existing) return reply.status(404).send({ error: "Grupo não encontrado" });
      return prisma.accessGroup.update({
        where: { id },
        data: { name, description, permissions: permissions ?? [] },
      });
    }
  );

  // DELETE /:id — remover grupo
  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireCompanyScope(), requireRole([UserRole.ADMIN, UserRole.OPERATOR])] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const existing = await prisma.accessGroup.findFirst({ where: { id, companyId } });
      if (!existing) return reply.status(404).send({ error: "Grupo não encontrado" });
      await prisma.accessGroup.delete({ where: { id } });
      return { ok: true };
    }
  );
}
