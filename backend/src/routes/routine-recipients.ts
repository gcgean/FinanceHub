import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { resolveCompanyId } from "../lib/company.js";
import { RecipientRole } from "@prisma/client";

const RecipientBody = z.object({
  name:           z.string().min(1),
  role:           z.nativeEnum(RecipientRole).default("SUPERVISOR"),
  telegramChatId: z.string().optional().nullable(),
  email:          z.string().email().optional().nullable(),
  whatsapp:       z.string().optional().nullable(),
  usuAtend:       z.string().optional().nullable(),   // nome em SupportTicket.usuAtend
  departamentos:  z.array(z.string()).default([]),
  notes:          z.string().optional().nullable(),
  aiInstructions: z.string().optional().nullable(),
  telegramBotId:  z.string().optional().nullable(),
  active:         z.boolean().optional().default(true),
});

// ATTENDANT sem usuAtend faria o relatório cobrir a equipe inteira (ver routine-scheduler).
// Bloqueia esse estado já na criação/edição.
function assertAttendantHasUsuAtend(role: RecipientRole, usuAtend?: string | null) {
  if (role === "ATTENDANT" && !usuAtend?.trim()) {
    return 'Atendente exige o campo "Nome no Sistema de Atendimento" (usuAtend) — sem ele o relatório cobriria a equipe inteira.';
  }
  return null;
}

const recipientSelect = {
  id: true, companyId: true, name: true, role: true,
  telegramChatId: true, email: true, whatsapp: true,
  usuAtend: true, departamentos: true, notes: true,
  aiInstructions: true,
  telegramBotId: true,
  telegramBot: { select: { id: true, name: true, username: true } },
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
    const err = assertAttendantHasUsuAtend(data.role, data.usuAtend);
    if (err) { reply.status(400); return { error: err }; }
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

    // Valida o estado RESULTANTE (campos enviados sobrepõem os existentes).
    const finalRole     = data.role     ?? existing.role;
    const finalUsuAtend = data.usuAtend !== undefined ? data.usuAtend : existing.usuAtend;
    const err = assertAttendantHasUsuAtend(finalRole, finalUsuAtend);
    if (err) { reply.status(400); return { error: err }; }

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
        ...(data.notes          !== undefined && { notes:          data.notes }),
        ...(data.aiInstructions !== undefined && { aiInstructions: data.aiInstructions }),
        ...(data.telegramBotId  !== undefined && { telegramBotId:  data.telegramBotId }),
        ...(data.active         !== undefined && { active:         data.active }),
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
