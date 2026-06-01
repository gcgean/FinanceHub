import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { resolveCompanyId } from "../lib/company.js";
import { calcularMetricasDetalhadas, formatarRelatorioEstruturado } from "../services/support-tickets-report.service.js";
import { chatService } from "../modules/ai/services/chat.service.js";

// ── helpers reutilizados do support-tickets (WHERE builder) ───────────────────

function buildWhere(companyId: string, q: Record<string, string>) {
  const where: Record<string, unknown> = { companyId };
  if (q.dateFrom || q.dateTo) {
    where.dataHoraFinalizacao = {
      ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
      ...(q.dateTo   ? { lte: new Date(q.dateTo) }   : {}),
    };
  }
  if (q.departamento) {
    const depts = q.departamento.split(",").map((d: string) => d.trim()).filter(Boolean);
    if (depts.length === 1) where.departamento = depts[0];
    else if (depts.length > 1) where.departamento = { in: depts };
  }
  if (q.usuAtend)     where.usuAtend           = { contains: q.usuAtend,        mode: "insensitive" };
  if (q.nomeCli)      where.nomeCli            = { contains: q.nomeCli,         mode: "insensitive" };
  if (q.procedimento) where.nomesProcedimento  = { contains: q.procedimento,    mode: "insensitive" };
  if (q.notaMin || q.notaMax) {
    where.nota = {
      ...(q.notaMin ? { gte: Number(q.notaMin) } : {}),
      ...(q.notaMax ? { lte: Number(q.notaMax) } : {}),
    };
  }
  return where;
}

const TICKET_SELECT = {
  id: true, externalId: true, protocolo: true,
  dataHoraAtendimento: true, dataHoraFinalizacao: true,
  nomeCli: true, nomeClienteAtendimento: true,
  departamento: true, usuAtend: true, nota: true,
  tempoAtendimento: true, pontoRevenda: true, cidRes: true,
  nomesProcedimento: true, obsAtendimento: true,
  solucao: true, nomeDesenvolvedor: true, numeroCliente: true,
  horaAtendimento: true,
} as const;

// ── rota de gerenciamento (requer autenticação) ────────────────────────────────

export async function supportShareRoutes(app: FastifyInstance) {

  // POST /support-share — cria ou retorna link existente ativo
  app.post("/", { preHandler: [requireAuth(app)] }, async (request) => {
    const companyId = await resolveCompanyId(request);
    const body = (request.body ?? {}) as { name?: string };

    const token = nanoid(16);
    const link = await prisma.supportShareLink.create({
      data: { token, companyId, name: body.name?.trim() || "Acesso compartilhado" },
    });
    return link;
  });

  // GET /support-share — lista links da empresa
  app.get("/", { preHandler: [requireAuth(app)] }, async (request) => {
    const companyId = await resolveCompanyId(request);
    return prisma.supportShareLink.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  });

  // DELETE /support-share/:id — revoga link
  app.delete("/:id", { preHandler: [requireAuth(app)] }, async (request, reply) => {
    const companyId = await resolveCompanyId(request);
    const { id } = request.params as { id: string };
    const existing = await prisma.supportShareLink.findFirst({ where: { id, companyId } });
    if (!existing) { reply.status(404); return { error: "NOT_FOUND" }; }
    await prisma.supportShareLink.delete({ where: { id } });
    return { ok: true };
  });

  // PATCH /support-share/:id/toggle — ativa/desativa link
  app.patch("/:id/toggle", { preHandler: [requireAuth(app)] }, async (request, reply) => {
    const companyId = await resolveCompanyId(request);
    const { id } = request.params as { id: string };
    const existing = await prisma.supportShareLink.findFirst({ where: { id, companyId } });
    if (!existing) { reply.status(404); return { error: "NOT_FOUND" }; }
    return prisma.supportShareLink.update({ where: { id }, data: { active: !existing.active } });
  });
}

// ── rotas públicas (sem autenticação, usa token) ───────────────────────────────

export async function publicSupportRoutes(app: FastifyInstance) {

  // Resolve companyId a partir do token público
  async function resolveShareToken(token: string, reply: import("fastify").FastifyReply) {
    const link = await prisma.supportShareLink.findUnique({ where: { token } });
    if (!link)        { reply.status(404).send({ error: "LINK_NOT_FOUND" }); return null; }
    if (!link.active) { reply.status(403).send({ error: "LINK_INACTIVE" });  return null; }
    return link.companyId;
  }

  // GET /public-support/:token/tickets
  app.get("/:token/tickets", async (request, reply) => {
    const { token } = request.params as { token: string };
    const companyId = await resolveShareToken(token, reply);
    if (!companyId) return;

    const q = request.query as Record<string, string>;
    const where = buildWhere(companyId, q);
    const take  = Math.min(Number(q.take ?? 50), 100);
    const skip  = Number(q.skip ?? 0);

    const [items, total] = await Promise.all([
      prisma.supportTicket.findMany({ where, select: TICKET_SELECT, orderBy: { dataHoraFinalizacao: "desc" }, take, skip }),
      prisma.supportTicket.count({ where }),
    ]);

    // Retorna também lista de departamentos para o filtro
    const departments = await prisma.department.findMany({
      where: { companyId },
      select: { erpCode: true, name: true },
    });

    return reply.send({ items, total, take, skip, departments });
  });

  // POST /public-support/:token/ai-report
  app.post("/:token/ai-report", async (request, reply) => {
    const { token } = request.params as { token: string };
    const companyId = await resolveShareToken(token, reply);
    if (!companyId) return;

    const {
      dateFrom, dateTo,
      reportType = "daily",
      departamentos,
      usuAtend,
    } = request.body as {
      dateFrom: string; dateTo: string;
      reportType?: "daily" | "weekly" | "monthly";
      departamentos?: string[];
      usuAtend?: string;
    };

    if (!dateFrom || !dateTo) {
      return reply.status(400).send({ error: "dateFrom e dateTo são obrigatórios" });
    }

    // Busca tickets
    const aiWhere: Record<string, unknown> = {
      companyId,
      dataHoraFinalizacao: { gte: new Date(dateFrom), lte: new Date(dateTo) },
    };
    if (departamentos?.length) aiWhere.departamento = departamentos.length === 1 ? departamentos[0] : { in: departamentos };
    if (usuAtend?.trim()) aiWhere.usuAtend = { contains: usuAtend.trim(), mode: "insensitive" };

    const tickets = await prisma.supportTicket.findMany({
      where: aiWhere,
      select: {
        dataHoraAtendimento: true, dataHoraFinalizacao: true, tempoAtendimento: true,
        usuAtend: true, nomeCli: true, nomeClienteAtendimento: true,
        nota: true, departamento: true, nomesProcedimento: true,
        pontoRevenda: true, cidRes: true, dataCadastroCliente: true, obsAtendimento: true,
      },
    });

    if (tickets.length === 0) {
      return reply.status(404).send({ error: "Nenhum atendimento encontrado no período." });
    }

    const departments = await prisma.department.findMany({ where: { companyId }, select: { erpCode: true, name: true } });
    const deptNameMap = new Map(departments.map(d => [d.erpCode, d.name]));

    const [company, aiContextRow] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { segmento: true } }),
      prisma.supportAIContext.findUnique({ where: { companyId }, select: { context: true } }),
    ]);

    const metricas = calcularMetricasDetalhadas(tickets, dateFrom, dateTo, deptNameMap, new Date(dateFrom));
    const estruturado = formatarRelatorioEstruturado(metricas, reportType, "GESTOR");

    let analiseIA = "";
    try {
      const provider = await chatService.getProvider(companyId);
      const mediaAtendPorTecnico = metricas.atendentes_ativos > 0 ? +(metricas.total_atendimentos / metricas.atendentes_ativos).toFixed(1) : 0;
      const resumoMetricas = JSON.stringify({
        tipo_relatorio: reportType,
        resumo_geral: {
          total_chamados: metricas.total_atendimentos, tma_equipe_minutos: metricas.tma_geral,
          ids: metricas.ids, classificacao: metricas.classificacao,
          atendentes_ativos: metricas.atendentes_ativos, media_chamados_por_tecnico: mediaAtendPorTecnico,
          nota_media_geral: metricas.nota_media, segmento_empresa: company?.segmento,
          clientes_novos_ultimos_90_dias: metricas.clientes_novos,
        },
        todos_tecnicos: metricas.atendentes.map(a => ({ nome: a.nome, atendimentos: a.atendimentos, tma_minutos: a.tma, nota_media: a.nota_media })),
        clientes_recorrentes: metricas.titulares.slice(0, 15),
        clientes_pior_nota: metricas.clientes_pior_nota,
        observacoes_atendimentos: metricas.obs_amostra,
        procedimentos_dominantes: metricas.procedimentos.slice(0, 8),
      }, null, 2);

      const gestorContexto = aiContextRow?.context?.trim() ?? "";
      const contextoIA = gestorContexto ? `\n\n---\nCONTEXTO DA EQUIPE:\n${gestorContexto}\n---` : "";

      const aiResponse = await provider.generateResponse([
        { role: "system", content: `Você é um analista sênior de suporte. Analise os dados e escreva um relatório direto para o gestor.${contextoIA}` },
        { role: "user",   content: resumoMetricas },
      ]);
      analiseIA = aiResponse.content ?? "";
    } catch {
      analiseIA = "(Análise IA indisponível no momento)";
    }

    return reply.send({
      report:   `${estruturado}\n\n💡 ANÁLISE\n\n${analiseIA}`,
      analise:  analiseIA,
      metricas,
    });
  });
}
