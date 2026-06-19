import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireCompanyScope } from "../lib/auth.js";
import { resolveCompanyId } from "../lib/company.js";
import { chatService } from "../modules/ai/services/chat.service.js";
import { formatPeriodoExtenso } from "../services/support-tickets-report.service.js";

// ---------------------------------------------------------------------------
// Helpers de métricas para relatório IA — formato estruturado
// ---------------------------------------------------------------------------

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

function calcularMetricasDetalhadas(
  tickets: TicketMetrics[],
  dateFrom: string,
  dateTo: string,
  deptNameMap: Map<string, string>,
  periodoRef: Date
) {
  const total = tickets.length;

  // Tempos por ticket
  const temposArr = tickets.map(t => { const n = parseInt(t.tempoAtendimento ?? ""); return isNaN(n) ? 0 : n; });
  const temposValidos = temposArr.filter(n => n > 0);
  const tmaGeral = temposValidos.length
    ? Math.round(temposValidos.reduce((a, b) => a + b, 0) / temposValidos.length) : 0;

  // Notas
  const notasArr = tickets.filter(t => t.nota != null).map(t => t.nota as number);
  const notaMedia = notasArr.length ? +(notasArr.reduce((a, b) => a + b, 0) / notasArr.length).toFixed(1) : null;

  // Atendentes ativos
  const atendentesAtivos = new Set(tickets.map(t => t.usuAtend?.trim()).filter(Boolean)).size;

  // IDS: tickets por atendente / capacidade padrão (16 tickets/agente/dia em turnos de 8h)
  const ticketsPorAtendente = atendentesAtivos > 0 ? total / atendentesAtivos : 0;
  const ids = +Math.min(ticketsPorAtendente / 16 * 100, 300).toFixed(1);
  let classificacao = "";
  if      (ids >= 120) classificacao = "🔥🔥 Extremamente pesado";
  else if (ids >=  80) classificacao = "🔥 Muito pesado";
  else if (ids >=  60) classificacao = "⚡ Pesado";
  else if (ids >=  40) classificacao = "🟡 Normal";
  else                 classificacao = "🟢 Tranquilo";

  // Fila por departamento
  const filaMap = new Map<string, number>();
  tickets.forEach(t => {
    const nome = (t.departamento ? (deptNameMap.get(t.departamento) ?? t.departamento) : "Sem fila");
    filaMap.set(nome, (filaMap.get(nome) ?? 0) + 1);
  });
  const fila = [...filaMap.entries()].sort((a, b) => b[1] - a[1]).map(([nome, count]) => ({ nome, count }));

  // Procedimentos: agrupa pelo NOME COMPLETO (como aparece nos itens).
  // NÃO dividir por vírgula — o próprio nome do procedimento contém vírgulas
  // (ex.: "NFE - EMISSÃO, CANCELAMENTO, ESTORNO, DUVIDAS E CONFIGURAÇÕES").
  const procMap = new Map<string, number>();
  tickets.forEach(t => {
    const nome = (t.nomesProcedimento ?? "").trim();
    if (nome) procMap.set(nome, (procMap.get(nome) ?? 0) + 1);
  });
  const procedimentos = [...procMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, count]) => ({ nome, count }));

  // Titulares (empresa/nomeCli)
  const titularMap = new Map<string, number>();
  tickets.forEach(t => {
    const nome = t.nomeCli?.trim();
    if (nome) titularMap.set(nome, (titularMap.get(nome) ?? 0) + 1);
  });
  const titulares = [...titularMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, count]) => ({ nome, count }));

  // Clientes novos (cadastrado nos últimos 90 dias antes do período)
  const novetyDias = new Date(periodoRef);
  novetyDias.setDate(novetyDias.getDate() - 90);
  const clientesNovos = new Set<string>();
  tickets.forEach(t => {
    const nome = t.nomeCli?.trim();
    const dtCad = t.dataCadastroCliente;
    if (nome && dtCad && dtCad >= novetyDias) {
      clientesNovos.add(nome);
    }
  });

  // Notas por cliente — média de nota agrupada por nomeCli
  const cliNotaMap = new Map<string, { notas: number[]; count: number }>();
  tickets.forEach(t => {
    const nome = t.nomeCli?.trim();
    if (!nome) return;
    if (!cliNotaMap.has(nome)) cliNotaMap.set(nome, { notas: [], count: 0 });
    const e = cliNotaMap.get(nome)!;
    e.count++;
    if (t.nota != null) e.notas.push(t.nota);
  });
  // Clientes com nota média mais baixa (mín. 1 avaliação), ordenados do pior para o melhor
  const clientesPiorNota = [...cliNotaMap.entries()]
    .filter(([, d]) => d.notas.length > 0)
    .map(([nome, d]) => ({
      nome,
      atendimentos: d.count,
      nota_media: +(d.notas.reduce((a, b) => a + b, 0) / d.notas.length).toFixed(1),
    }))
    .sort((a, b) => a.nota_media - b.nota_media)
    .slice(0, 10);

  // Operadores (contato individual / nomeClienteAtendimento)
  const opMap = new Map<string, number>();
  tickets.forEach(t => {
    const nome = t.nomeClienteAtendimento?.trim();
    if (nome) opMap.set(nome, (opMap.get(nome) ?? 0) + 1);
  });
  const operadores = [...opMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, count]) => ({ nome, count }));

  // Atendentes: volume + TMA + nota
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
    }))
    .sort((a, b) => b.atendimentos - a.atendimentos);

  const atendentesPorTMA = [...atendentes]
    .filter(a => a.tma > 0)
    .sort((a, b) => a.tma - b.tma);

  // Observações dos atendimentos — amostras de obs com nota baixa ou para clientes recorrentes
  // Pega até 20 obs não vazias, priorizando tickets com nota baixa
  // Ignora observações genéricas de lançamento automático
  const OBS_IGNORADAS = /lancado via excel|lançado via excel|lan[çc]ado via/i;
  const obsAmostra = tickets
    .filter(t => t.obsAtendimento && t.obsAtendimento.trim().length > 5 && !OBS_IGNORADAS.test(t.obsAtendimento))
    .sort((a, b) => {
      // prioriza nota baixa; se sem nota, vai pro fim
      const na = a.nota ?? 10;
      const nb = b.nota ?? 10;
      return na - nb;
    })
    .slice(0, 20)
    .map(t => ({
      cliente: t.nomeCli?.trim() ?? "—",
      tecnico: t.usuAtend?.trim() ?? "—",
      nota: t.nota,
      obs: t.obsAtendimento!.trim().slice(0, 300), // limita tamanho
    }));

  return {
    periodo: { de: dateFrom, ate: dateTo },
    total_atendimentos: total,
    tma_geral: tmaGeral,
    nota_media: notaMedia,
    atendentes_ativos: atendentesAtivos,
    ids,
    classificacao,
    fila,
    procedimentos,
    titulares,
    operadores,
    atendentes,
    atendentes_por_tma: atendentesPorTMA,
    clientes_pior_nota: clientesPiorNota,
    obs_amostra: obsAmostra,
    clientes_novos: [...clientesNovos].slice(0, 10),
  };
}

function formatarRelatorioEstruturado(
  m: ReturnType<typeof calcularMetricasDetalhadas>,
  reportType: string,
  userName: string
): string {
  const { de, ate } = m.periodo;
  const fmtDate = (iso: string) => {
    try { const [y, mo, d] = iso.split("T")[0].split("-"); return `${d}/${mo}/${y}`; } catch { return iso; }
  };

  const labels: Record<string, string> = { daily: "DIÁRIO", weekly: "SEMANAL", monthly: "MENSAL" };
  const typeLabel = labels[reportType] ?? "DIÁRIO";
  const periodoLabel = de === ate.split("T")[0]
    ? fmtDate(de)
    : `${fmtDate(de)} a ${fmtDate(ate)}`;

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

  if (m.fila.length > 0) {
    r += `\n\n ===FILA DE ATENDIMENTOS===\n`;
    m.fila.forEach(f => { r += `\n${f.nome}=${f.count}`; });
  }

  if (m.procedimentos.length > 0) {
    r += `\n\n ===PROCEDIMENTOS===\n`;
    m.procedimentos.forEach(p => { r += `\n${p.nome}=${p.count}`; });
  }

  if (m.titulares.length > 0) {
    r += `\n\n ===TITULARES CLIENTES===\n`;
    m.titulares.forEach(t => { r += `\n${t.nome}=${t.count}`; });
  }

  if (m.operadores.length > 0) {
    r += `\n\n ===OPERADORES CLIENTES===\n`;
    m.operadores.forEach(o => { r += `\n${o.nome}=${o.count}`; });
  }

  if (m.atendentes.length > 0) {
    r += `\n\n ===ATENDENTES===\n`;
    m.atendentes.forEach(a => { r += `\n${a.nome}=${a.atendimentos}`; });
  }

  if (m.atendentes_por_tma.length > 0) {
    r += `\n\n ===TMA dos atendentes===\n`;
    m.atendentes_por_tma.forEach(a => { r += `\n${a.nome}=${a.tma}`; });
  }

  return r;
}

const PROMPT_ANALISE = `Você é um analista sênior de suporte de uma empresa de software.
Analise os dados abaixo e escreva um relatório direto e honesto para o gestor da equipe.
Fale como se estivesse conversando pessoalmente com o gestor — sem rodeios, sem elogios desnecessários.

ANALISE OBRIGATORIAMENTE os seguintes pontos (apenas se houver dados suficientes para cada um):

1. 🔴 TÉCNICOS COM DESEMPENHO RUIM
   - Quem tem nota média baixa (abaixo de 3)?
   - Quem tem TMA muito acima da média da equipe? Pode indicar falta de preparo ou enrolação.
   - Quem atende volume muito abaixo dos colegas? Aponte diretamente — isso pode ser escoração.

2. 🔴 TÉCNICOS SOBRECARREGADOS
   - Quem está claramente acumulando mais chamados que os outros?
   - Isso é injusto com a equipe — cite pelo nome.

3. 🟡 CLIENTES PROBLEMÁTICOS / RECORRENTES
   - Quais clientes abriram mais chamados? Alta recorrência pode indicar produto instável, falta de treinamento do cliente ou insatisfação.
   - Cite nome do cliente e quantidade de chamados.

4. 🔴 CLIENTES INSATISFEITOS (PIORES NOTAS)
   - Quais clientes deram as notas mais baixas? Isso indica insatisfação real.
   - Se um cliente recorrente também tem nota baixa, é sinal de alerta grave — pode estar à beira de cancelar ou reclamar publicamente.
   - Cite nome do cliente, nota média e quantidade de chamados.

5. 🟡 PROCEDIMENTOS DOMINANTES
   - Se um tipo de procedimento representa a maioria dos chamados, pode indicar bug recorrente ou necessidade de documentação/treinamento.

Regras:
- Seja específico — cite nomes reais dos dados fornecidos (técnicos e clientes).
- Frases curtas e objetivas.
- Não repita os números do relatório estruturado — foque em interpretação e alertas.
- Não invente informações que não estejam nos dados.
- Finalize sempre com 1 ação prática e urgente que o gestor deveria tomar agora.`;

// Prompt individual — quando o relatório é filtrado por um técnico específico
function buildPromptIndividual(nomeTecnico: string): string {
  return `Você é um analista sênior de suporte de uma empresa de software.
Os dados abaixo são EXCLUSIVAMENTE dos atendimentos de ${nomeTecnico}.
Este é um relatório de DESEMPENHO INDIVIDUAL — NÃO comente que os dados são de um único técnico como anomalia, isso é intencional.

Gere um relatório COMPLETO e DETALHADO no seguinte formato EXATO (use markdown com títulos, tabelas e emojis):

---

# 📋 Relatório de Desempenho Individual — ${nomeTecnico}
**Período:** [Diário/Semanal/Mensal conforme tipo_relatorio] | **Cargo:** [extraia do contexto se disponível] | **Especialidade:** [extraia do contexto se disponível]

---

## 📊 1. VOLUME E PRODUTIVIDADE
- Total de chamados e classificação: muito baixo / baixo / normal / alto / muito alto para o período.
- TMA em minutos — comparar com a média informada nos dados. Acima ou abaixo do esperado?
- Se o volume for muito baixo (menos de 30 no mês), adicione um alerta ⚠️ explicando que a análise tem pouco peso estatístico e sugerindo verificar ausências/afastamentos.

## ⭐ 2. QUALIDADE DO ATENDIMENTO
- Nota média — classifique: ≥9 excelente / 7–8.9 boa / 5–6.9 limite / <5 crítica.
- Mencione se a nota está acima/abaixo da média da equipe.
- Liste os clientes com piores notas para ${nomeTecnico} (se houver).
- Se não houver notas críticas, diga explicitamente.

## 🟡 3. CLIENTES RECORRENTES
- Monte uma tabela markdown: | Cliente | Chamados |
- Destaque o cliente que mais aparece e qual % dos chamados representa.
- Se algum cliente for novo (últimos 90 dias), mencione — a impressão inicial importa.
- Algum cliente se repete de forma preocupante?

## 🔧 4. PROCEDIMENTOS MAIS REALIZADOS
- Liste os procedimentos realizados por ${nomeTecnico}.
- Análise: os procedimentos estão dentro do escopo/nível esperado para o cargo?
- Se houver procedimento fora do escopo (ex: pré-venda para N2 de suporte), alerte o gestor.
- Especialização positiva ou acúmulo indevido?

## 🔍 ANÁLISE COMPLEMENTAR
Inclua obrigatoriamente estas subseções se os dados permitirem:
- **Chamados encerrados por falta de interação:** há indícios de encerramento indevido para melhorar métricas?
- **Nível dos atendimentos vs. cargo:** os chamados atendidos estão dentro do nível esperado para ${nomeTecnico}?
- **Classificação dos clientes (Curva A/B/C):** tente classificar os principais clientes e informe se ${nomeTecnico} está atendendo clientes estratégicos ou não.

## 🏁 RESUMO PERFORMÁTICO — ${nomeTecnico}
Monte uma tabela markdown com colunas: | Indicador | Resultado | Status |
Inclua obrigatoriamente estas linhas:
- Volume de chamados → 🟢 Normal / 🟡 Atenção / 🔴 Preocupante
- TMA → 🟢 / 🟡 / 🔴
- Nota média → 🟢 / 🟡 / 🔴
- Notas críticas (< 5) → quantidade ou "Nenhuma"
- Atendimentos fora do escopo → "Nenhum" ou descrição
- Clientes Curva A atendidos → quantidade ou "—"

## ✅ AÇÃO RECOMENDADA AO GESTOR
Uma ação clara, específica e urgente que o gestor deve tomar em relação a ${nomeTecnico}. Seja direto — cite o nome, o problema e o que fazer.

---

Regras absolutas:
- Use SEMPRE o nome ${nomeTecnico} — nunca "o técnico" ou "o atendente".
- Cite números reais dos dados: chamados, notas, clientes, TMA.
- Não invente informações. Se não há dados, diga que não há.
- Use markdown: **negrito** para alertas, tabelas, > citações para avisos importantes.
- O relatório deve ser longo, detalhado e útil — não faça um resumo curto.`;
}

// Converte string para Date apenas se for válida
function toDate(val: unknown): Date | null {
  if (!val || typeof val !== "string" || val.trim() === "") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function supportTicketsRoutes(app: FastifyInstance) {
  // POST /support-tickets/import — upsert one ticket from integrator
  app.post(
    "/import",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const d = request.body as Record<string, unknown>;

      const externalId = Number(d.externalId);
      if (!externalId) {
        return reply.status(400).send({ error: "externalId required" });
      }

      const next = {
        codCli: d.codCli != null ? Number(d.codCli) : null,
        obsAtendimento: (d.obsAtendimento as string) || null,
        cidRes: (d.cidRes as string) || null,
        dataCadastroCliente: toDate(d.dataCadastroCliente),
        solucao: (d.solucao as string) || null,
        dataHoraAtendimento: toDate(d.dataHoraAtendimento),
        dataHoraFinalizacao: toDate(d.dataHoraFinalizacao),
        nota: d.nota != null && d.nota !== "" ? Number(d.nota) : null,
        departamento: (d.departamento as string) || null,
        protocolo: (d.protocolo as string) || null,
        nomeClienteAtendimento: (d.nomeClienteAtendimento as string) || null,
        tempoAtendimento: (d.tempoAtendimento as string) || null,
        numeroCliente: (d.numeroCliente as string) || null,
        nomeCli: (d.nomeCli as string) || null,
        usuLanc: (d.usuLanc as string) || null,
        usuConfEnc: (d.usuConfEnc as string) || null,
        usuAtend: (d.usuAtend as string) || null,
        nomeDesenvolvedor: (d.nomeDesenvolvedor as string) || null,
        horaAtendimento: (d.horaAtendimento as string) || null,
        pontoRevenda: (d.pontoRevenda as string) || null,
        codigosProcedimento: (d.codigosProcedimento as string) || null,
        nomesProcedimento: (d.nomesProcedimento as string) || null,
      };

      const SELECT_FIELDS = {
        id: true, externalId: true, codCli: true, obsAtendimento: true,
        cidRes: true, dataCadastroCliente: true, solucao: true,
        dataHoraAtendimento: true, dataHoraFinalizacao: true, nota: true,
        departamento: true, protocolo: true, nomeClienteAtendimento: true,
        tempoAtendimento: true, numeroCliente: true, nomeCli: true,
        usuLanc: true, usuConfEnc: true, usuAtend: true, nomeDesenvolvedor: true,
        horaAtendimento: true, pontoRevenda: true, codigosProcedimento: true,
        nomesProcedimento: true,
      } as const;

      type ExistingTicket = {
        id: string; externalId: number; codCli: number | null;
        obsAtendimento: string | null; cidRes: string | null;
        dataCadastroCliente: Date | null; solucao: string | null;
        dataHoraAtendimento: Date | null; dataHoraFinalizacao: Date | null;
        nota: number | null; departamento: string | null; protocolo: string | null;
        nomeClienteAtendimento: string | null; tempoAtendimento: string | null;
        numeroCliente: string | null; nomeCli: string | null; usuLanc: string | null;
        usuConfEnc: string | null; usuAtend: string | null; nomeDesenvolvedor: string | null;
        horaAtendimento: string | null; pontoRevenda: string | null;
        codigosProcedimento: string | null; nomesProcedimento: string | null;
      };

      const isSame = (e: ExistingTicket) =>
        e.codCli === next.codCli &&
        e.obsAtendimento === next.obsAtendimento &&
        e.cidRes === next.cidRes &&
        (e.dataCadastroCliente?.toISOString() ?? null) === (next.dataCadastroCliente?.toISOString() ?? null) &&
        e.solucao === next.solucao &&
        (e.dataHoraAtendimento?.toISOString() ?? null) === (next.dataHoraAtendimento?.toISOString() ?? null) &&
        (e.dataHoraFinalizacao?.toISOString() ?? null) === (next.dataHoraFinalizacao?.toISOString() ?? null) &&
        (e.nota ?? null) === (next.nota ?? null) &&
        e.departamento === next.departamento &&
        e.protocolo === next.protocolo &&
        e.nomeClienteAtendimento === next.nomeClienteAtendimento &&
        e.tempoAtendimento === next.tempoAtendimento &&
        e.numeroCliente === next.numeroCliente &&
        e.nomeCli === next.nomeCli &&
        e.usuLanc === next.usuLanc &&
        e.usuConfEnc === next.usuConfEnc &&
        e.usuAtend === next.usuAtend &&
        e.nomeDesenvolvedor === next.nomeDesenvolvedor &&
        e.horaAtendimento === next.horaAtendimento &&
        e.pontoRevenda === next.pontoRevenda &&
        e.codigosProcedimento === next.codigosProcedimento &&
        e.nomesProcedimento === next.nomesProcedimento;

      // 1. Se tem protocolo, ele é a chave de dedup principal (evita duplicatas quando o
      //    sistema de origem reutiliza o mesmo UUID em múltiplos id_Atend).
      if (next.protocolo) {
        const byProtocolo = await prisma.supportTicket.findFirst({
          where: { companyId, protocolo: next.protocolo },
          select: SELECT_FIELDS,
        });
        if (byProtocolo) {
          if (isSame(byProtocolo)) {
            return reply.status(200).send({ id: byProtocolo.id, changed: false });
          }
          // Atualiza o registro existente (inclusive externalId se mudou)
          const updated = await prisma.supportTicket.update({
            where: { id: byProtocolo.id },
            data: { externalId, ...next },
            select: { id: true },
          });
          return reply.status(200).send({ id: updated.id, changed: true });
        }
      }

      // 2. Fallback: dedup por externalId (tickets sem protocolo ou protocolo novo)
      const existing = await prisma.supportTicket.findUnique({
        where: { companyId_externalId: { companyId, externalId } },
        select: SELECT_FIELDS,
      });

      if (existing) {
        if (isSame(existing)) {
          return reply.status(200).send({ id: existing.id, changed: false });
        }
        const updated = await prisma.supportTicket.update({
          where: { id: existing.id },
          data: next,
          select: { id: true },
        });
        return reply.status(200).send({ id: updated.id, changed: true });
      }

      const created = await prisma.supportTicket.create({
        data: { companyId, externalId, ...next },
        select: { id: true },
      });

      return reply.status(201).send({ id: created.id, changed: true });
    }
  );

  // GET /support-tickets — list tickets
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const q = request.query as Record<string, string>;

      const where: Record<string, unknown> = { companyId };
      if (q.dateFrom || q.dateTo) {
        where.dataHoraFinalizacao = {
          ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
          ...(q.dateTo   ? { lte: new Date(q.dateTo) }   : {}),
        };
      }
      if (q.departamento) {
        const depts = q.departamento.split(",").map((d: string) => d.trim()).filter(Boolean);
        if (depts.length === 1) {
          where.departamento = depts[0];
        } else if (depts.length > 1) {
          where.departamento = { in: depts };
        }
      }
      if (q.usuAtend)     where.usuAtend        = { contains: q.usuAtend,        mode: "insensitive" };
      if (q.nomeCli)      where.nomeCli         = { contains: q.nomeCli,         mode: "insensitive" };
      if (q.procedimento) where.nomesProcedimento = { contains: q.procedimento, mode: "insensitive" };
      if (q.notaMin || q.notaMax) {
        where.nota = {
          ...(q.notaMin ? { gte: Number(q.notaMin) } : {}),
          ...(q.notaMax ? { lte: Number(q.notaMax) } : {}),
        };
      }

      const take = Number(q.take ?? 50);
      const skip = Number(q.skip ?? 0);

      const [items, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          orderBy: { dataHoraFinalizacao: "desc" },
          take,
          skip,
        }),
        prisma.supportTicket.count({ where }),
      ]);

      return reply.send({ items, total, take, skip });
    }
  );

  // POST /support-tickets/metrics — calcula métricas sem chamar IA (para exibir dashboard imediato)
  app.post(
    "/metrics",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { dateFrom, dateTo, departamentos, usuAtend } = request.body as {
        dateFrom: string; dateTo: string;
        departamentos?: string[];
        usuAtend?: string;
      };
      if (!dateFrom || !dateTo) return reply.status(400).send({ error: "dateFrom e dateTo são obrigatórios" });

      const where: Record<string, unknown> = {
        companyId,
        dataHoraFinalizacao: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      };
      if (departamentos?.length) where.departamento = departamentos.length === 1 ? departamentos[0] : { in: departamentos };
      if (usuAtend?.trim()) where.usuAtend = { contains: usuAtend.trim(), mode: "insensitive" };

      const tickets = await prisma.supportTicket.findMany({
        where,
        select: {
          dataHoraAtendimento: true, dataHoraFinalizacao: true, tempoAtendimento: true,
          usuAtend: true, nomeCli: true, nomeClienteAtendimento: true,
          nota: true, departamento: true, nomesProcedimento: true,
          pontoRevenda: true, cidRes: true, dataCadastroCliente: true, obsAtendimento: true,
        },
      });
      if (tickets.length === 0) return reply.status(404).send({ error: "Nenhum atendimento no período." });

      const departments = await prisma.department.findMany({ where: { companyId }, select: { erpCode: true, name: true } });
      const deptNameMap = new Map(departments.map(d => [d.erpCode, d.name]));

      const metricas = calcularMetricasDetalhadas(tickets, dateFrom, dateTo, deptNameMap, new Date(dateFrom));
      return reply.send({ metricas });
    }
  );

  // GET /support-tickets/ai-context — retorna o contexto salvo pelo gestor
  app.get(
    "/ai-context",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const saved = await prisma.supportAIContext.findUnique({ where: { companyId } });
      return reply.send({ context: saved?.context ?? "" });
    }
  );

  // PUT /support-tickets/ai-context — salva / atualiza o contexto do gestor
  app.put(
    "/ai-context",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { context } = request.body as { context: string };
      const saved = await prisma.supportAIContext.upsert({
        where:  { companyId },
        update: { context },
        create: { companyId, context },
        select: { context: true, updatedAt: true },
      });
      return reply.send(saved);
    }
  );

  // POST /support-tickets/ai-report — gera relatório IA com base nos tickets do período
  app.post(
    "/ai-report",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { dateFrom, dateTo, reportType = "daily", departamentos, usuAtend } = request.body as {
        dateFrom: string;
        dateTo: string;
        reportType?: "daily" | "weekly" | "monthly";
        departamentos?: string[];
        usuAtend?: string;
      };

      if (!dateFrom || !dateTo) {
        return reply.status(400).send({ error: "dateFrom e dateTo são obrigatórios" });
      }

      // 1. Buscar tickets do período (por data de finalização)
      const aiWhere: Record<string, unknown> = {
        companyId,
        dataHoraFinalizacao: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      };
      if (departamentos && departamentos.length > 0) {
        aiWhere.departamento = departamentos.length === 1
          ? departamentos[0]
          : { in: departamentos };
      }
      if (usuAtend && usuAtend.trim()) {
        aiWhere.usuAtend = { contains: usuAtend.trim(), mode: "insensitive" };
      }

      const tickets = await prisma.supportTicket.findMany({
        where: aiWhere,
        select: {
          dataHoraAtendimento: true,
          dataHoraFinalizacao: true,
          tempoAtendimento: true,
          usuAtend: true,
          nomeCli: true,
          nomeClienteAtendimento: true,
          nota: true,
          departamento: true,
          nomesProcedimento: true,
          pontoRevenda: true,
          cidRes: true,
          dataCadastroCliente: true,
          obsAtendimento: true,
        },
      });

      if (tickets.length === 0) {
        return reply.status(404).send({
          error: "Nenhum atendimento encontrado no período informado. Sincronize os dados antes de gerar o relatório.",
        });
      }

      // 2. Buscar departamentos para resolver nomes
      const departments = await prisma.department.findMany({
        where: { companyId },
        select: { erpCode: true, name: true },
      });
      const deptNameMap = new Map(departments.map(d => [d.erpCode, d.name]));

      const isIndividual = !!(usuAtend && usuAtend.trim());
      const nomeTecnico  = isIndividual ? usuAtend!.trim().toUpperCase() : "";

      // Busca dados em paralelo: empresa, contexto global e (se individual) destinatário pelo usuAtend
      const [company, aiContextRow, recipientRow] = await Promise.all([
        prisma.company.findUnique({ where: { id: companyId }, select: { segmento: true } }),
        prisma.supportAIContext.findUnique({ where: { companyId }, select: { context: true } }),
        isIndividual
          ? prisma.routineRecipient.findFirst({
              where: { companyId, usuAtend: { equals: usuAtend!.trim(), mode: "insensitive" } },
              select: { aiInstructions: true, name: true },
            })
          : Promise.resolve(null),
      ]);
      const segmentoEmpresa = company?.segmento ?? null;
      const gestorContexto  = aiContextRow?.context?.trim() ?? "";
      // Instruções IA do destinatário específico (prioridade sobre contexto global)
      const recipientInstructions = recipientRow?.aiInstructions?.trim() ?? "";

      // 3. Nome do usuário autenticado
      const userName = String((request.user as unknown as { name?: string }).name ?? "Gestor")
        .split(" ")[0]
        .toUpperCase();

      // 4. Calcular métricas detalhadas
      const metricas = calcularMetricasDetalhadas(tickets, dateFrom, dateTo, deptNameMap, new Date(dateFrom));

      // 5. Gerar parte estruturada (código TypeScript — não depende de IA)
      const estruturado = formatarRelatorioEstruturado(metricas, reportType, userName);

      // 6. Chamar IA apenas para análise interpretativa breve
      let analiseIA = "";
      try {
        const provider = await chatService.getProvider(companyId);
        // Calcula média de atendimentos por técnico para identificar desbalanceamento
        const mediaAtendPorTecnico = metricas.atendentes_ativos > 0
          ? +(metricas.total_atendimentos / metricas.atendentes_ativos).toFixed(1)
          : 0;

        // Identifica técnicos com volume muito abaixo da média (possível escoração)
        const tecnicosAbaixoMedia = metricas.atendentes
          .filter(a => a.atendimentos < mediaAtendPorTecnico * 0.5)
          .map(a => ({ ...a, desvio_vs_media: `${a.atendimentos} vs média ${mediaAtendPorTecnico}` }));

        // Identifica técnicos sobrecarregados (volume acima de 1.5x a média)
        const tecnicosSobrecarregados = metricas.atendentes
          .filter(a => a.atendimentos > mediaAtendPorTecnico * 1.5)
          .map(a => ({ ...a, desvio_vs_media: `${a.atendimentos} vs média ${mediaAtendPorTecnico}` }));

        // Técnicos com nota baixa (abaixo de 3)
        const tecnicosNotaBaixa = metricas.atendentes
          .filter(a => a.nota_media != null && a.nota_media < 3);

        // Técnicos com TMA muito acima da média geral
        const tmaMediaEquipe = metricas.tma_geral;
        const tecnicosTMAAlto = metricas.atendentes_por_tma
          .filter(a => a.tma > tmaMediaEquipe * 1.5)
          .map(a => ({ ...a, tma_vs_media: `TMA ${a.tma}min vs média equipe ${tmaMediaEquipe}min` }));

        const resumoMetricas = JSON.stringify({
          tipo_relatorio: reportType, // "daily" | "weekly" | "monthly"
          resumo_geral: {
            total_chamados: metricas.total_atendimentos,
            tma_equipe_minutos: metricas.tma_geral,
            ids: metricas.ids,
            classificacao: metricas.classificacao,
            atendentes_ativos: metricas.atendentes_ativos,
            media_chamados_por_tecnico: mediaAtendPorTecnico,
            nota_media_geral: metricas.nota_media,
            segmento_empresa: segmentoEmpresa,
            clientes_novos_ultimos_90_dias: metricas.clientes_novos,
          },
          alertas_tecnicos: {
            possivelmente_escorando_menos_50pct_media: tecnicosAbaixoMedia,
            sobrecarregados_acima_150pct_media: tecnicosSobrecarregados,
            nota_baixa_abaixo_3: tecnicosNotaBaixa,
            tma_alto_acima_150pct_media: tecnicosTMAAlto,
          },
          todos_tecnicos: metricas.atendentes.map(a => ({
            nome: a.nome,
            atendimentos: a.atendimentos,
            tma_minutos: a.tma,
            nota_media: a.nota_media,
          })),
          clientes_recorrentes: metricas.titulares.slice(0, 15),
          clientes_pior_nota: metricas.clientes_pior_nota,
          procedimentos_dominantes: metricas.procedimentos.slice(0, 8),
        }, null, 2);

        // No relatório geral o cabeçalho com o período é inserido pelo CÓDIGO (determinístico),
        // então pedimos à IA para NÃO criar seu próprio título nem linha de período.
        const tituloInstrucao = `\n\n---\nIMPORTANTE: NÃO escreva um título principal (ex.: "RELATÓRIO SEMANAL...") nem uma linha de "Período" no início — eles já são inseridos automaticamente acima da sua resposta. Comece direto pela primeira seção da análise.`;

        // Escolhe prompt base: individual (quando filtrado por técnico) ou geral da equipe
        const promptBase = isIndividual
          ? buildPromptIndividual(nomeTecnico)
          : PROMPT_ANALISE + tituloInstrucao;

        // Instrução extra para semanal/mensal GERAIS
        const promptAdicional = (!isIndividual && (reportType === "weekly" || reportType === "monthly"))
          ? `\n\n---\nINSTRUÇÃO ADICIONAL PARA RELATÓRIO ${reportType === "weekly" ? "SEMANAL" : "MENSAL"}:\n\nAo final da sua análise, inclua obrigatoriamente uma seção:\n\n📋 AVALIAÇÃO INDIVIDUAL DOS TÉCNICOS\n\nPara cada técnico em "todos_tecnicos", escreva 1 parágrafo curto com:\n- Volume de atendimentos (se acima ou abaixo da média da equipe)\n- TMA (se está dentro do esperado ou fora)\n- Nota média recebida pelos clientes (se tem ou não avaliações)\n- Veredicto: ✅ Bom desempenho / ⚠️ Atenção necessária / 🔴 Desempenho preocupante\n\nSeja direto. Cite o nome do técnico em negrito (**Nome**). Não invente dados.`
          : "";

        // Contexto adicional:
        // - Individual: usa aiInstructions do destinatário (se configurado), senão cai no contexto global
        // - Geral: usa contexto global da equipe
        let contextoIA = "";
        if (isIndividual && recipientInstructions) {
          contextoIA = `\n\n---\nINSTRUÇÕES ESPECÍFICAS DO GESTOR PARA ${nomeTecnico}:\n${recipientInstructions}\n---`;
        } else if (gestorContexto) {
          const label = isIndividual
            ? `CONTEXTO DA EQUIPE (use para contextualizar a análise de ${nomeTecnico}):`
            : "CONTEXTO DA EQUIPE (fornecido pelo gestor — use para personalizar a análise):";
          contextoIA = `\n\n---\n${label}\n${gestorContexto}\n---`;
        }

        const aiResponse = await provider.generateResponse([
          { role: "system", content: promptBase + contextoIA + promptAdicional },
          { role: "user",   content: resumoMetricas },
        ]);
        analiseIA = aiResponse.content ?? "";
      } catch (aiErr) {
        const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
        console.error("[ai-report] Falha ao chamar IA:", msg);
        analiseIA = `(Análise IA indisponível no momento — ${msg})`;
      }

      // Cabeçalho determinístico com o período por extenso no relatório GERAL.
      // (No individual o período já vai no cabeçalho gerado pela IA.)
      if (!isIndividual && analiseIA && !analiseIA.startsWith("(")) {
        const periodoExtenso = formatPeriodoExtenso(new Date(dateFrom), new Date(dateTo));
        const tipoLabelPt = reportType === "weekly" ? "SEMANAL" : reportType === "monthly" ? "MENSAL" : "DIÁRIO";
        const cabecalhoPeriodo = `# 📊 RELATÓRIO ${tipoLabelPt} DE SUPORTE — ${periodoExtenso}\n*Período analisado: ${periodoExtenso}*`;
        analiseIA = `${cabecalhoPeriodo}\n\n---\n\n${analiseIA}`;
      }

      const relatorioFinal = `${estruturado}\n\n💡 ANÁLISE\n\n${analiseIA}`;

      return reply.send({
        report:   relatorioFinal,  // texto completo para copiar/compartilhar
        analise:  analiseIA,       // só o texto da IA (para exibir separado da dashboard)
        metricas,
      });
    }
  );

  app.post(
    "/ai-chat",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request, reply) => {
      const companyId = await resolveCompanyId(request);
      const { messages, context } = request.body as {
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        context?: string; // o relatório gerado anteriormente
      };

      if (!messages || messages.length === 0) {
        return reply.status(400).send({ error: "messages é obrigatório" });
      }

      const systemPrompt = `Você é um assistente especialista em análise de suporte ao cliente.
O gestor acabou de receber um relatório de atendimentos e pode ter dúvidas sobre os dados.
Responda de forma direta, clara e em português.
Não invente dados — baseie-se apenas no contexto do relatório fornecido.
${context ? `\n\nRELATÓRIO ATUAL:\n${context}` : ""}`;

      const provider = await chatService.getProvider(companyId);
      const aiResponse = await provider.generateResponse([
        { role: "system", content: systemPrompt },
        ...messages,
      ]);

      return reply.send({ reply: aiResponse.content });
    }
  );
}
