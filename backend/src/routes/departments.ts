import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCompanyScope } from "../lib/auth";
import { resolveCompanyId } from "../lib/company";

export async function departmentsRoutes(app: FastifyInstance) {
  // GET / — list all departments for the company
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const items = await prisma.department.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, erpCode: true, createdAt: true },
      });
      return reply.send(items);
    }
  );

  // POST / — create department
  app.post(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { name, erpCode } = request.body as { name: string; erpCode: string };

      if (!name?.trim() || !erpCode?.trim()) {
        return reply.status(400).send({ error: "name and erpCode are required" });
      }

      const dept = await prisma.department.create({
        data: { companyId, name: name.trim(), erpCode: erpCode.trim() },
      });
      return reply.status(201).send(dept);
    }
  );

  // PUT /:id — update department
  app.put(
    "/:id",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { id } = request.params as { id: string };
      const { name, erpCode } = request.body as { name: string; erpCode: string };

      if (!name?.trim() || !erpCode?.trim()) {
        return reply.status(400).send({ error: "name and erpCode are required" });
      }

      // Ensure it belongs to this company
      const existing = await prisma.department.findFirst({ where: { id, companyId } });
      if (!existing) return reply.status(404).send({ error: "Department not found" });

      const dept = await prisma.department.update({
        where: { id },
        data: { name: name.trim(), erpCode: erpCode.trim() },
      });
      return reply.send(dept);
    }
  );

  // DELETE /:id — delete department
  app.delete(
    "/:id",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { id } = request.params as { id: string };

      const existing = await prisma.department.findFirst({ where: { id, companyId } });
      if (!existing) return reply.status(404).send({ error: "Department not found" });

      await prisma.department.delete({ where: { id } });
      return reply.status(204).send();
    }
  );
}
