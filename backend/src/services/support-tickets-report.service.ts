/**
 * Serviço de geração de relatório IA de Atendimentos.
 * Extraído de support-tickets.ts para ser reutilizável pelo scheduler de rotinas.
 */

import { prisma } from "../lib/prisma.js";
import { chatService } from "../modules/ai/services/chat.service.js";

// ── tipos ─────────────────────────────────────────────────────────────────────

type TicketMetrics = {
  dataHoraAtendimento: Date | null;
  dataHoraFinalizacao: Date | null;
  tempoAtendimento: string | null;
  usuAtend: string | null;
  nomeCli: string | null;
  nomeClienteAtendimento: string | null;
  nota: number | null;
  departamento: string | null;
  nomesProcedimento: string | null;
  pontoRevenda: string | null;
  cidRes: string | null;
  dataCadastroCliente: Date | null;
  obsAtendimento: string | null;
};

// ── prompt IA ─────────────────────────────────────────────────────────────────

const PROMPT_ANALISE = `Você é um analista sênior de suporte de uma empresa de software.
Analise os dados abaixo e escreva um relatório direto e honesto para o gestor da equipe.
Fale como se estivesse conversando pessoalmente com o gestor — sem rodeios, sem elogios desnecessários.

ANALISE OBRIGATORIAMENTE os seguintes pontos (apenas se houver dados suficientes para cada um):

1. 🔴 TÉCNICOS COM DESEMPENHO RUIM
   - Quem tem nota média baixa (abaixo de 3)?
   - Quem tem TMA muito acima da média da equipe?
   - Quem atende volume muito abaixo dos colegas?

2. 🔴 TÉCNICOS SOBRECARREGADOS
   - Quem está claramente acumulando mais chamados que os outros?

3. 🟡 CLIENTES PROBLEMÁTICOS / RECORRENTES
   - Quais clientes abriram mais chamados?

4. 🔴 CLIENTES INSATISFEITOS (PIORES NOTAS)
   - Quais clientes deram as notas mais baixas?

5. 🟡 PROCEDIMENTOS DOMINANTES
   - Se um tipo de procedimento representa a maioria dos chamados.

6. 💬 OBSERVAÇÕES DOS ATENDIMENTOS
   - Identifique padrões nas observações: reclamações repetidas, problemas recorrentes.
   - Não transcreva as observações — resuma os padrões que encontrou.

Regras:
- Seja específico — cite nomes reais dos dados fornecidos.
- Frases curtas e objetivas.
- Não repita os números do relatório estruturado — foque em interpretação e alertas.
- Não invente informações que não estejam nos dados.
- Finalize sempre com 1 ação prática e urgente que o gestor deveria tomar agora.`;

// ── cálculo de métricas ───────────────────────────────────────────────────────

function calcularMetricasDetalhadas(
  tickets: TicketMetrics[],
  dateFrom: string,
  dateTo: string,
  deptNameMap: Map<string, string>,
  periodoRef: Date
) {
  const total = tickets.length;
  const temposArr = tickets.map(t => { const n = parseInt(t.tempoAtendimento ?? ""); return isNaN(n) ? 0 : n; });
  const temposValidos = temposArr.filter(n => n > 0);
  const tmaGeral = temposValidos.length
    ? Math.round(temposValidos.reduce((a, b) => a + b, 0) / temposValidos.length) : 0;
  const notasArr = tickets.filter(t => t.nota != null).map(t => t.nota as number);
  const notaMedia = notasArr.length ? +(notasArr.reduce((a, b) => a + b, 0) / notasArr.length).toFixed(1) : null;
  const atendentesAtivos = new Set(tickets.map(t => t.usuAtend?.trim()).filter(Boolean)).size;
  const ticketsPorAtendente = atendentesAtivos > 0 ? total / atendentesAtivos : 0;
  const ids = +Math.min(ticketsPorAtendente / 16 * 100, 300).toFixed(1);
  let classificacao = "";
  if      (ids >= 120) classificacao = "🔥🔥 Extremamente pesado";
  else if (ids >=  80) classificacao = "🔥 Muito pesado";
  else if (ids >=  60) classificacao = "⚡ Pesado";
  else if (ids >=  40) classificacao = "🟡 Normal";
  else                 classificacao = "🟢 Tranquilo";

  const filaMap = new Map<string, number>();
  tickets.forEach(t => {
    const nome = (t.departamento ? (deptNameMap.get(t.departamento) ?? t.departamento) : "Sem fila");
    filaMap.set(nome, (filaMap.get(nome) ?? 0) + 1);
  });
  const fila = [...filaMap.entries()].sort((a, b) => b[1] - a[1]).map(([nome, count]) => ({ nome, count }));

  const procMap = new Map<string, number>();
  tickets.forEach(t => {
    (t.nomesProcedimento ?? "").split(",").forEach(p => {
      const nome = p.trim();
      if (nome) procMap.set(nome, (procMap.get(nome) ?? 0) + 1);
    });
  });
  const procedimentos = [...procMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, count]) => ({ nome, count }));

  const titularMap = new Map<string, number>();
  tickets.forEach(t => { const nome = t.nomeCli?.trim(); if (nome) titularMap.set(nome, (titularMap.get(nome) ?? 0) + 1); });
  const titulares = [...titularMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, count]) => ({ nome, count }));

  const novetyDias = new Date(periodoRef);
  novetyDias.setDate(novetyDias.getDate() - 90);
  const clientesNovos = new Set<string>();
  tickets.forEach(t => {
    const nome = t.nomeCli?.trim();
    const dtCad = t.dataCadastroCliente;
    if (nome && dtCad && dtCad >= novetyDias) clientesNovos.add(nome);
  });

  const cliNotaMap = new Map<string, { notas: number[]; count: number }>();
  tickets.forEach(t => {
    const nome = t.nomeCli?.trim();
    if (!nome) return;
    if (!cliNotaMap.has(nome)) cliNotaMap.set(nome, { notas: [], count: 0 });
    const e = cliNotaMap.get(nome)!;
    e.count++;
    if (t.nota != null) e.notas.push(t.nota);
  });
  const clientesPiorNota = [...cliNotaMap.entries()]
    .filter(([, d]) => d.notas.length > 0)
    .map(([nome, d]) => ({ nome, atendimentos: d.count, nota_media: +(d.notas.reduce((a, b) => a + b, 0) / d.notas.length).toFixed(1) }))
    .sort((a, b) => a.nota_media - b.nota_media).slice(0, 10);

  const opMap = new Map<string, number>();
  tickets.forEach(t => { const nome = t.nomeClienteAtendimento?.trim(); if (nome) opMap.set(nome, (opMap.get(nome) ?? 0) + 1); });
  const operadores = [...opMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, count]) => ({ nome, count }));

  const tecDataMap = new Map<string, { count: number; tempos: number[]; notas: number[] }>();
  tickets.forEach((t, i) => {
    const nome = t.usuAtend?.trim();
    if (!nome) return;
    if (!tecDataMap.has(nome)) tecDataMap.set(nome, { count: 0, tempos: [], notas: [] });
    const e = tecDataMap.get(nome)!;
    e.count++;
    if (temposArr[i] > 0) e.tempos.push(temposArr[i]);
    if (t.nota != null) e.notas.push(t.nota);
  });
  const atendentes = [...tecDataMap.entries()]
    .map(([nome, d]) => ({
      nome,
      atendimentos: d.count,
      tma: d.tempos.length ? Math.round(d.tempos.reduce((a, b) => a + b, 0) / d.tempos.length) : 0,
      nota_media: d.notas.length ? +(d.notas.reduce((a, b) => a + b, 0) / d.notas.length).toFixed(1) : null,
    })).sort((a, b) => b.atendimentos - a.atendimentos);
  const atendentesPorTMA = [...atendentes].filter(a => a.tma > 0).sort((a, b) => a.tma - b.tma);

  const OBS_IGNORADAS = /lancado via excel|lançado via excel|lan[çc]ado via/i;
  const obsAmostra = tickets
    .filter(t => t.obsAtendimento && t.obsAtendimento.trim().length > 5 && !OBS_IGNORADAS.test(t.obsAtendimento))
    .sort((a, b) => { const na = a.nota ?? 10; const nb = b.nota ?? 10; return na - nb; })
    .slice(0, 20)
    .map(t => ({ cliente: t.nomeCli?.trim() ?? "—", tecnico: t.usuAtend?.trim() ?? "—", nota: t.nota, obs: t.obsAtendimento!.trim().slice(0, 300) }));

  return {
    periodo: { de: dateFrom, ate: dateTo },
    total_atendimentos: total, tma_geral: tmaGeral, nota_media: notaMedia,
    atendentes_ativos: atendentesAtivos, ids, classificacao,
    fila, procedimentos, titulares, operadores, atendentes,
    atendentes_por_tma: atendentesPorTMA, clientes_pior_nota: clientesPiorNota,
    obs_amostra: obsAmostra, clientes_novos: [...clientesNovos].slice(0, 10),
  };
}

function formatarRelatorioEstruturado(m: ReturnType<typeof calcularMetricasDetalhadas>, reportType: string, userName: string): string {
  const { de, ate } = m.periodo;
  const fmtDate = (iso: string) => { try { const [y, mo, d] = iso.split("T")[0].split("-"); return `${d}/${mo}/${y}`; } catch { return iso; } };
  const labels: Record<string, string> = { daily: "DIÁRIO", weekly: "SEMANAL", monthly: "MENSAL" };
  const typeLabel = labels[reportType] ?? "DIÁRIO";
  const periodoLabel = de === ate.split("T")[0] ? fmtDate(de) : `${fmtDate(de)} a ${fmtDate(ate)}`;

  let r = `OLÁ ${userName}\n`;
  r += `👤👤👤 ( ${periodoLabel} ) RELATÓRIO ${typeLabel} DO SUPORTE 👤👤👤\n\n`;
  r += `\nQuantidade total de chamados: =${m.total_atendimentos}`;
  r += `\nTMA: =${m.tma_geral} Minutos`;
  if (m.nota_media != null) r += `\nNota Média: =${m.nota_media}`;
  r += `\n\n===NÍVEL DO PERÍODO===`;
  r += `\nAtendentes ativos: =${m.atendentes_ativos}`;
  r += `\nOcupação: =${m.ids}%`;
  r += `\nIDS: =${m.ids}`;
  r += `\nClassificação: =${m.classificacao}`;
  if (m.fila.length > 0) { r += `\n\n ===FILA DE ATENDIMENTOS===\n`; m.fila.forEach(f => { r += `\n${f.nome}=${f.count}`; }); }
  if (m.procedimentos.length > 0) { r += `\n\n ===PROCEDIMENTOS===\n`; m.procedimentos.forEach(p => { r += `\n${p.nome}=${p.count}`; }); }
  if (m.titulares.length > 0) { r += `\n\n ===TITULARES CLIENTES===\n`; m.titulares.forEach(t => { r += `\n${t.nome}=${t.count}`; }); }
  if (m.operadores.length > 0) { r += `\n\n ===OPERADORES CLIENTES===\n`; m.operadores.forEach(o => { r += `\n${o.nome}=${o.count}`; }); }
  if (m.atendentes.length > 0) { r += `\n\n ===ATENDENTES===\n`; m.atendentes.forEach(a => { r += `\n${a.nome}=${a.atendimentos}`; }); }
  if (m.atendentes_por_tma.length > 0) { r += `\n\n ===TMA dos atendentes===\n`; m.atendentes_por_tma.forEach(a => { r += `\n${a.nome}=${a.tma}`; }); }
  return r;
}

// ── função principal exportada ────────────────────────────────────────────────

export type SupportTicketsReportResult = {
  content: string;
  title: string;
  periodFrom: Date;
  periodTo: Date;
};

export async function generateSupportTicketsAIReport(
  companyId: string,
  dateFrom: Date,
  dateTo: Date,
  reportType: "DAILY" | "WEEKLY" | "MONTHLY",
  recipientName = "GESTOR"
): Promise<SupportTicketsReportResult> {
  const dateFromStr = dateFrom.toISOString();
  const dateToStr = dateTo.toISOString();
  const reportTypeLower = reportType.toLowerCase() as "daily" | "weekly" | "monthly";

  // 1. Buscar tickets
  const tickets = await prisma.supportTicket.findMany({
    where: {
      companyId,
      dataHoraFinalizacao: { gte: dateFrom, lte: dateTo },
    },
    select: {
      dataHoraAtendimento: true, dataHoraFinalizacao: true,
      tempoAtendimento: true, usuAtend: true, nomeCli: true,
      nomeClienteAtendimento: true, nota: true, departamento: true,
      nomesProcedimento: true, pontoRevenda: true, cidRes: true,
      dataCadastroCliente: true, obsAtendimento: true,
    },
  });

  if (tickets.length === 0) {
    const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const labels: Record<string, string> = { DAILY: "Diário", WEEKLY: "Semanal", MONTHLY: "Mensal" };
    const title = `Relatório ${labels[reportType]} de Atendimentos — ${fmtDate(dateFrom)}`;
    return { content: `Nenhum atendimento encontrado no período ${fmtDate(dateFrom)} a ${fmtDate(dateTo)}.`, title, periodFrom: dateFrom, periodTo: dateTo };
  }

  // 2. Departamentos
  const departments = await prisma.department.findMany({ where: { companyId }, select: { erpCode: true, name: true } });
  const deptNameMap = new Map(departments.map(d => [d.erpCode, d.name]));

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { segmento: true } });
  const segmentoEmpresa = company?.segmento ?? null;

  const userName = recipientName.split(" ")[0].toUpperCase();

  // 3. Métricas
  const metricas = calcularMetricasDetalhadas(tickets, dateFromStr, dateToStr, deptNameMap, dateFrom);

  // 4. Parte estruturada
  const estruturado = formatarRelatorioEstruturado(metricas, reportTypeLower, userName);

  // 5. IA interpretativa
  let analiseIA = "";
  try {
    const provider = await chatService.getProvider(companyId);
    const mediaAtendPorTecnico = metricas.atendentes_ativos > 0 ? +(metricas.total_atendimentos / metricas.atendentes_ativos).toFixed(1) : 0;
    const tecnicosAbaixoMedia = metricas.atendentes.filter(a => a.atendimentos < mediaAtendPorTecnico * 0.5).map(a => ({ ...a, desvio_vs_media: `${a.atendimentos} vs média ${mediaAtendPorTecnico}` }));
    const tecnicosSobrecarregados = metricas.atendentes.filter(a => a.atendimentos > mediaAtendPorTecnico * 1.5).map(a => ({ ...a, desvio_vs_media: `${a.atendimentos} vs média ${mediaAtendPorTecnico}` }));
    const tecnicosNotaBaixa = metricas.atendentes.filter(a => a.nota_media != null && a.nota_media < 3);
    const tmaMediaEquipe = metricas.tma_geral;
    const tecnicosTMAAlto = metricas.atendentes_por_tma.filter(a => a.tma > tmaMediaEquipe * 1.5).map(a => ({ ...a, tma_vs_media: `TMA ${a.tma}min vs média equipe ${tmaMediaEquipe}min` }));

    const resumoMetricas = JSON.stringify({
      tipo_relatorio: reportTypeLower,
      resumo_geral: { total_chamados: metricas.total_atendimentos, tma_equipe_minutos: metricas.tma_geral, ids: metricas.ids, classificacao: metricas.classificacao, atendentes_ativos: metricas.atendentes_ativos, media_chamados_por_tecnico: mediaAtendPorTecnico, nota_media_geral: metricas.nota_media, segmento_empresa: segmentoEmpresa, clientes_novos_ultimos_90_dias: metricas.clientes_novos },
      alertas_tecnicos: { possivelmente_escorando_menos_50pct_media: tecnicosAbaixoMedia, sobrecarregados_acima_150pct_media: tecnicosSobrecarregados, nota_baixa_abaixo_3: tecnicosNotaBaixa, tma_alto_acima_150pct_media: tecnicosTMAAlto },
      todos_tecnicos: metricas.atendentes.map(a => ({ nome: a.nome, atendimentos: a.atendimentos, tma_minutos: a.tma, nota_media: a.nota_media })),
      clientes_recorrentes: metricas.titulares.slice(0, 15),
      clientes_pior_nota: metricas.clientes_pior_nota,
      observacoes_atendimentos: metricas.obs_amostra,
      procedimentos_dominantes: metricas.procedimentos.slice(0, 8),
    }, null, 2);

    const promptAdicional = (reportTypeLower === "weekly" || reportTypeLower === "monthly")
      ? `\n\n---\nINSTRUÇÃO ADICIONAL PARA RELATÓRIO ${reportTypeLower === "weekly" ? "SEMANAL" : "MENSAL"}:\n\nAo final da sua análise, inclua obrigatoriamente uma seção:\n\n📋 AVALIAÇÃO INDIVIDUAL DOS TÉCNICOS\n\nPara cada técnico em "todos_tecnicos", escreva 1 parágrafo curto com volume, TMA, nota e veredicto: ✅ Bom / ⚠️ Atenção / 🔴 Preocupante`
      : "";

    const aiResponse = await provider.generateResponse([
      { role: "system", content: PROMPT_ANALISE + promptAdicional },
      { role: "user", content: resumoMetricas },
    ]);
    analiseIA = aiResponse.content ?? "";
  } catch {
    analiseIA = "(Análise IA indisponível no momento)";
  }

  const content = `${estruturado}\n\n💡 ANÁLISE\n\n${analiseIA}`;

  const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const labels: Record<string, string> = { DAILY: "Diário", WEEKLY: "Semanal", MONTHLY: "Mensal" };
  const title = `Relatório ${labels[reportType]} de Atendimentos — ${fmtDate(dateFrom)}`;

  return { content, title, periodFrom: dateFrom, periodTo: dateTo };
}
