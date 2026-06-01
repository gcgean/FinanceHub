import React from "react";
import { Headphones, Clock, Star, Users, TrendingUp, BarChart2, ListOrdered, Award } from "lucide-react";
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

export function SupportDashboard({ m }: { m: AiMetricas }) {
  const atendentesChart = (m.atendentes ?? []).slice(0, 13).map((a: AiMetricas) => ({ name: a.nome, value: a.atendimentos }));
  const tmaChart = [...(m.atendentes_por_tma ?? [])].sort((a: AiMetricas, b: AiMetricas) => b.tma - a.tma).slice(0, 13).map((a: AiMetricas) => ({ name: a.nome, value: a.tma }));
  const procChart = (m.procedimentos ?? []).slice(0, 8).map((p: AiMetricas) => ({ name: p.nome.length > 30 ? p.nome.slice(0, 30) + "…" : p.nome, value: p.count }));
  const filaChart = (m.fila ?? []).map((f: AiMetricas) => ({ name: f.nome, value: f.count }));
  const titulares = m.titulares ?? [];

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
          <ResponsiveContainer width="100%" height={Math.max(procChart.length * 32 + 20, 60)}>
            <BarChart data={procChart} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${v} chamados`, "Volume"]} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {procChart.map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[(i + 7) % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
