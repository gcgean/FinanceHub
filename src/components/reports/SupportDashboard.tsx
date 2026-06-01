import React from "react";
import { Headphones, Clock, Star, Users, TrendingUp, BarChart2, ListOrdered, Award, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export const CHART_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6",
  "#ef4444","#14b8a6","#f97316","#84cc16","#06b6d4","#a855f7","#d946ef",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AiMetricas = Record<string, any>;

export function idsColor(ids: number) {
  if (ids >= 120) return "text-red-500";
  if (ids >= 80)  return "text-orange-500";
  if (ids >= 60)  return "text-yellow-500";
  if (ids >= 40)  return "text-blue-500";
  return "text-green-500";
}

export function KpiCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
        <span className="text-xs text-muted-foreground uppercase font-semibold">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export function ChartCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Ranking composto ─────────────────────────────────────────────────────────
// Critérios (em ordem): 1º nota_media desc · 2º atendimentos desc · 3º tma asc
function buildRanking(atendentes: AiMetricas[]): AiMetricas[] {
  return [...atendentes].sort((a, b) => {
    const notaA = a.nota_media ?? -1;
    const notaB = b.nota_media ?? -1;
    if (notaB !== notaA) return notaB - notaA;
    if (b.atendimentos !== a.atendimentos) return b.atendimentos - a.atendimentos;
    return (a.tma ?? 0) - (b.tma ?? 0);
  });
}

const MEDALS = ["🥇", "🥈", "🥉"];

function notaStars(nota: number | null) {
  if (nota == null) return <span className="text-xs text-muted-foreground">—</span>;
  const full  = Math.floor(nota);
  const color = nota >= 7 ? "text-emerald-500" : nota >= 5 ? "text-yellow-500" : nota >= 3 ? "text-orange-500" : "text-red-500";
  return (
    <span className={`text-xs font-bold ${color}`}>
      {"★".repeat(Math.min(full, 10))} {nota.toFixed(1)}
    </span>
  );
}

export function SupportDashboard({ m }: { m: AiMetricas }) {
  const atendentes = m.atendentes ?? [];
  const ranking    = buildRanking(atendentes);

  const atendentesChart = atendentes.slice(0, 13).map((a: AiMetricas) => ({ name: a.nome, value: a.atendimentos }));
  const tmaChart = [...(m.atendentes_por_tma ?? [])].sort((a: AiMetricas, b: AiMetricas) => b.tma - a.tma).slice(0, 13).map((a: AiMetricas) => ({ name: a.nome, value: a.tma }));
  const procChart = (m.procedimentos ?? []).slice(0, 8).map((p: AiMetricas) => ({ name: p.nome.length > 30 ? p.nome.slice(0, 30) + "…" : p.nome, value: p.count }));
  const filaChart = (m.fila ?? []).map((f: AiMetricas) => ({ name: f.nome, value: f.count }));
  const titulares = m.titulares ?? [];
  // TMA lookup por nome (atendentes_por_tma pode ter mais detalhes)
  const tmaByName = new Map<string, number>(
    (m.atendentes_por_tma ?? []).map((a: AiMetricas) => [a.nome, a.tma])
  );

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard icon={<Headphones className="w-4 h-4 text-indigo-500" />} label="Total Chamados" value={m.total_atendimentos} bg="bg-indigo-500/10" />
        <KpiCard icon={<Clock className="w-4 h-4 text-blue-500" />} label="TMA Médio" value={`${m.tma_geral} min`} bg="bg-blue-500/10" />
        <KpiCard icon={<Star className="w-4 h-4 text-yellow-500" />} label="Nota Média" value={m.nota_media != null ? m.nota_media : "—"} bg="bg-yellow-500/10" />
        <KpiCard icon={<Users className="w-4 h-4 text-purple-500" />} label="Atendentes" value={m.atendentes_ativos} bg="bg-purple-500/10" />
        <div className="rounded-xl border bg-card p-3 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-xs text-muted-foreground uppercase font-semibold">IDS / Nível</span>
          </div>
          <p className={`text-xl font-bold ${idsColor(m.ids)}`}>{m.ids}%</p>
          <p className="text-xs text-muted-foreground leading-tight">{m.classificacao}</p>
        </div>
      </div>

      {/* Ranking de Técnicos */}
      {ranking.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-foreground">Ranking de Técnicos</span>
            <span className="text-xs text-muted-foreground ml-1">
              — 1º melhor nota · 2º maior volume · 3º menor TMA
            </span>
          </div>

          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem] gap-x-3 px-2 mb-2">
            <span />
            <span className="text-xs font-semibold text-muted-foreground uppercase">Técnico</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase text-center">Nota</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase text-center">Chamados</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase text-center">TMA</span>
          </div>

          <div className="space-y-1">
            {ranking.map((a: AiMetricas, i: number) => {
              const tma = tmaByName.get(a.nome) ?? a.tma ?? 0;
              const isTop = i < 3;
              const bgClass = i === 0
                ? "bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800"
                : i === 1
                ? "bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700"
                : i === 2
                ? "bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800"
                : "hover:bg-muted/40";

              return (
                <div
                  key={a.nome}
                  className={`grid grid-cols-[2rem_1fr_5rem_5rem_5rem] gap-x-3 items-center px-2 py-2 rounded-lg transition-colors ${bgClass}`}
                >
                  {/* Posição */}
                  <span className={`text-base text-center ${isTop ? "" : "text-xs text-muted-foreground font-bold"}`}>
                    {isTop ? MEDALS[i] : `${i + 1}º`}
                  </span>

                  {/* Nome */}
                  <span className={`text-sm truncate ${isTop ? "font-semibold" : "font-medium"}`}>
                    {a.nome}
                  </span>

                  {/* Nota */}
                  <div className="text-center">
                    {notaStars(a.nota_media)}
                  </div>

                  {/* Chamados */}
                  <div className="text-center">
                    <span className="text-xs font-semibold text-foreground">{a.atendimentos}</span>
                  </div>

                  {/* TMA */}
                  <div className="text-center">
                    <span className={`text-xs font-semibold ${tma > (m.tma_geral ?? 0) * 1.3 ? "text-red-500" : tma < (m.tma_geral ?? 0) * 0.8 ? "text-emerald-500" : "text-foreground"}`}>
                      {tma} min
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex gap-4 mt-3 pt-3 border-t flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              TMA abaixo da média
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              TMA acima da média (+30%)
            </span>
          </div>
        </div>
      )}

      {/* Atendentes por Volume + Fila */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard icon={<BarChart2 className="w-4 h-4 text-indigo-500" />} title="Atendentes por Volume">
          <ResponsiveContainer width="100%" height={Math.max(atendentesChart.length * 32 + 20, 60)}>
            <BarChart data={atendentesChart} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${v} atend.`, "Volume"]} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {atendentesChart.map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={<ListOrdered className="w-4 h-4 text-purple-500" />} title="Fila por Departamento">
          <ResponsiveContainer width="100%" height={Math.max(filaChart.length * 40 + 20, 80)}>
            <BarChart data={filaChart} layout="vertical" margin={{ left: 4, right: 32, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${v} chamados`, "Volume"]} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {filaChart.map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[(i + 4) % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* TMA + Top Procedimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard icon={<Clock className="w-4 h-4 text-blue-500" />} title="TMA por Atendente (min)">
          <ResponsiveContainer width="100%" height={Math.max(tmaChart.length * 32 + 20, 60)}>
            <BarChart data={tmaChart} layout="vertical" margin={{ left: 4, right: 32, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${v} min`, "TMA"]} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {tmaChart.map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={<ListOrdered className="w-4 h-4 text-emerald-500" />} title="Top Procedimentos">
          <div className="space-y-2">
            {(m.procedimentos ?? []).slice(0, 8).map((p: AiMetricas, i: number) => {
              const pct = m.total_atendimentos > 0
                ? Math.round((p.count / m.total_atendimentos) * 100)
                : 0;
              const maxCount = (m.procedimentos?.[0]?.count ?? 1);
              const barWidth = Math.round((p.count / maxCount) * 100);
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground leading-tight flex-1 min-w-0 truncate" title={p.nome}>
                      {p.nome}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-muted-foreground">{p.count}</span>
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: CHART_COLORS[(i + 7) % CHART_COLORS.length] + "22", color: CHART_COLORS[(i + 7) % CHART_COLORS.length] }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${barWidth}%`, backgroundColor: CHART_COLORS[(i + 7) % CHART_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* Top Clientes + Pior Nota */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard icon={<Award className="w-4 h-4 text-orange-500" />} title="Top 10 Clientes (Volume)">
          <div className="space-y-1.5">
            {titulares.slice(0, 10).map((t: AiMetricas, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-medium truncate">{t.nome}</span>
                    <span className="text-xs font-bold ml-2 shrink-0">{t.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((t.count / (titulares[0]?.count ?? 1)) * 100)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard icon={<Star className="w-4 h-4 text-red-500" />} title="Clientes com Pior Nota Média">
          <div className="space-y-1.5">
            {(m.clientes_pior_nota ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhum cliente com avaliação no período.</p>
            ) : (m.clientes_pior_nota ?? []).map((c: AiMetricas, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate">{c.nome}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">{c.atendimentos} atend.</span>
                    <Badge variant="outline" className={`text-xs px-1.5 py-0 ${c.nota_media < 3 ? "border-red-400 text-red-500" : c.nota_media < 5 ? "border-orange-400 text-orange-500" : "border-yellow-400 text-yellow-600"}`}>
                      ★ {Number(c.nota_media).toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
