import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { resolveCompanyId } from "../lib/company.js";
import { RecipientRole } from "@prisma/client";

const RecipientBody = z.object({
  name:          z.string().min(1),
  role:          z.nativeEnum(RecipientRole).default("SUPERVISOR"),
  telegramChatId: z.string().optional().nullable(),
  email:         z.string().email().optional().nullable(),
  whatsapp:      z.string().optional().nullable(),
  usuAtend:      z.string().optional().nullable(),   // nome em SupportTicket.usuAtend
  departamentos: z.array(z.string()).default([]),
  notes:         z.string().optional().nullable(),
  active:        z.boolean().optional().default(true),
});

const recipientSelect = {
  id: true, companyId: true, name: true, role: true,
  telegramChatId: true, email: true, whatsapp: true,
  usuAtend: true, departamentos: true, notes: true,
  active: true, createdAt: true, updatedAt: true,
} as const;

export async function routineRecipientsRoutes(app: FastifyInstance) {

  // GET /routine-recipients
  app.get("/", { preHandler: [requireAuth(app)] }, async (request) => {
    const companyId = await resolveCompanyId(request);
    return prisma.routineRecipient.findMany({
      where: { companyId },
      select: recipientSelect,
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
  });

  // POST /routine-recipients
  app.post("/", { preHandler: [requireAuth(app)] }, async (request, reply) => {
    const companyId = await resolveCompanyId(request);
    const data = RecipientBody.parse(request.body);
    const created = await prisma.routineRecipient.create({
      data: { companyId, ...data },
      select: recipientSelect,
    });
    reply.status(201);
    return created;
  });

  // PUT /routine-recipients/:id
  app.put("/:id", { preHandler: [requireAuth(app)] }, async (request, reply) => {
    const companyId = await resolveCompanyId(request);
    const { id } = request.params as { id: string };
    const data = RecipientBody.partial().parse(request.body);

    const existing = await prisma.routineRecipient.findFirst({ where: { id, companyId } });
    if (!existing) { reply.status(404); return { error: "NOT_FOUND" }; }

    return prisma.routineRecipient.update({
      where: { id },
      data: {
        ...(data.name          !== undefined && { name:          data.name }),
        ...(data.role          !== undefined && { role:          data.role }),
        ...(data.telegramChatId !== undefined && { telegramChatId: data.telegramChatId }),
        ...(data.email         !== undefined && { email:         data.email }),
        ...(data.whatsapp      !== undefined && { whatsapp:      data.whatsapp }),
        ...(data.usuAtend      !== undefined && { usuAtend:      data.usuAtend }),
        ...(data.departamentos !== undefined && { departamentos: data.departamentos }),
        ...(data.notes         !== undefined && { notes:         data.notes }),
        ...(data.active        !== undefined && { active:        data.active }),
      },
      select: recipientSelect,
    });
  });

  // DELETE /routine-recipients/:id
  app.delete("/:id", { preHandler: [requireAuth(app)] }, async (request, reply) => {
    const companyId = await resolveCompanyId(request);
    const { id } = request.params as { id: string };

    const existing = await prisma.routineRecipient.findFirst({ where: { id, companyId } });
    if (!existing) { reply.status(404); return { error: "NOT_FOUND" }; }

    await prisma.routineRecipient.delete({ where: { id } });
    return { ok: true };
  });
}
