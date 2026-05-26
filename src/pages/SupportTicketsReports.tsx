import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiFetch } from "@/utils/api";
import { listDepartments } from "@/api/departments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Filter, Search, Headphones, Clock, Star, Settings, Brain,
  CalendarDays, CalendarRange, Calendar, Copy, Check, Loader2,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Send, MessageSquare, X, Bell,
  Users, TrendingUp, Award, BarChart2, ListOrdered, BookOpen, Save,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { DateInputPicker } from "@/components/ui/DateInputPicker";
import { RoutinePanel } from "@/components/routines/RoutinePanel";

const PAGE_SIZE = 50;

// ── Cores para os gráficos ────────────────────────────────────────────────────
const CHART_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316","#84cc16","#06b6d4","#a855f7","#d946ef"];

function idsColor(ids: number) {
  if (ids >= 120) return "text-red-500";
  if (ids >= 80)  return "text-orange-500";
  if (ids >= 60)  return "text-yellow-500";
  if (ids >= 40)  return "text-blue-500";
  return "text-green-500";
}

function SupportDashboard({ m }: { m: AiMetricas }) {
  const atendentesChart = m.atendentes.slice(0, 13).map(a => ({ name: a.nome, value: a.atendimentos }));
  const tmaChart = [...m.atendentes_por_tma].sort((a, b) => b.tma - a.tma).slice(0, 13).map(a => ({ name: a.nome, value: a.tma }));
  const procChart = m.procedimentos.slice(0, 8).map(p => ({ name: p.nome.length > 30 ? p.nome.slice(0, 30) + "…" : p.nome, value: p.count }));
  const filaChart = m.fila.map(f => ({ name: f.nome, value: f.count }));

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

      {/* Linha 2: Atendentes por Volume + Fila por Departamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard icon={<BarChart2 className="w-4 h-4 text-indigo-500" />} title="Atendentes por Volume">
          <ResponsiveContainer width="100%" height={atendentesChart.length * 32 + 20}>
            <BarChart data={atendentesChart} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${v} atend.`, "Volume"]} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {atendentesChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={<ListOrdered className="w-4 h-4 text-purple-500" />} title="Fila por Departamento">
          <ResponsiveContainer width="100%" height={Math.max(filaChart.length * 40 + 20, 120)}>
            <BarChart data={filaChart} layout="vertical" margin={{ left: 4, right: 32, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${v} chamados`, "Volume"]} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {filaChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 4) % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Linha 3: TMA por Atendente + Top Procedimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard icon={<Clock className="w-4 h-4 text-blue-500" />} title="TMA por Atendente (min)">
          <ResponsiveContainer width="100%" height={tmaChart.length * 32 + 20}>
            <BarChart data={tmaChart} layout="vertical" margin={{ left: 4, right: 32, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${v} min`, "TMA"]} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {tmaChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={<ListOrdered className="w-4 h-4 text-emerald-500" />} title="Top Procedimentos">
          <ResponsiveContainer width="100%" height={procChart.length * 32 + 20}>
            <BarChart data={procChart} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${v} chamados`, "Volume"]} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {procChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 7) % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Linha 4: Top Clientes + Clientes Pior Nota */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard icon={<Award className="w-4 h-4 text-orange-500" />} title="Top 10 Clientes (Volume)">
          <div className="space-y-1.5">
            {m.titulares.slice(0, 10).map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-medium truncate">{t.nome}</span>
                    <span className="text-xs font-bold ml-2 shrink-0">{t.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((t.count / m.titulares[0].count) * 100)}%`,
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard icon={<Star className="w-4 h-4 text-red-500" />} title="Clientes com Pior Nota Média">
          <div className="space-y-1.5">
            {m.clientes_pior_nota.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhum cliente com avaliação no período.</p>
            ) : m.clientes_pior_nota.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate">{c.nome}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">{c.atendimentos} atend.</span>
                    <Badge
                      variant="outline"
                      className={`text-xs px-1.5 py-0 ${c.nota_media < 3 ? "border-red-400 text-red-500" : c.nota_media < 5 ? "border-orange-400 text-orange-500" : "border-yellow-400 text-yellow-600"}`}
                    >
                      ★ {c.nota_media.toFixed(1)}
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

function KpiCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
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

function ChartCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
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

type SupportTicket = {
  id: string;
  externalId: number;
  dataHoraAtendimento: string | null;
  dataHoraFinalizacao: string | null;
  protocolo: string | null;
  nomeCli: string | null;
  nomeClienteAtendimento: string | null;
  departamento: string | null;
  usuAtend: string | null;
  usuLanc: string | null;
  nota: number | null;
  tempoAtendimento: string | null;
  pontoRevenda: string | null;
  cidRes: string | null;
  obsAtendimento: string | null;
  solucao: string | null;
  nomesProcedimento: string | null;
  codigosProcedimento: string | null;
  nomeDesenvolvedor: string | null;
  usuConfEnc: string | null;
  numeroCliente: string | null;
  horaAtendimento: string | null;
};

type SupportTicketsResponse = {
  items: SupportTicket[];
  total: number;
  take: number;
  skip: number;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

type AiMetricas = {
  total_atendimentos: number;
  tma_geral: number;
  nota_media: number | null;
  atendentes_ativos: number;
  ids: number;
  classificacao: string;
  fila:           { nome: string; count: number }[];
  procedimentos:  { nome: string; count: number }[];
  titulares:      { nome: string; count: number }[];
  atendentes:     { nome: string; atendimentos: number; tma: number; nota_media: number | null }[];
  atendentes_por_tma: { nome: string; tma: number }[];
  clientes_pior_nota: { nome: string; atendimentos: number; nota_media: number }[];
};

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const defaultDateFrom = format(firstOfMonth, "yyyy-MM-dd");
const defaultDateTo   = format(today, "yyyy-MM-dd");

export default function SupportTicketsReports() {
  // ── filtros ──────────────────────────────────────────────────────────────
  const [dateFromInput, setDateFromInput] = useState(defaultDateFrom);
  const [dateToInput,   setDateToInput]   = useState(defaultDateTo);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);   // erpCodes
  const [deptPopoverOpen, setDeptPopoverOpen] = useState(false);
  const [usuAtendInput,   setUsuAtendInput]   = useState("");

  const [hasSearched,    setHasSearched]    = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom:   defaultDateFrom,
    dateTo:     defaultDateTo,
    departamentos: [] as string[],
    usuAtend:   "",
  });

  // ── paginação ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── IA — relatório ────────────────────────────────────────────────────────
  const [aiReport,    setAiReport]    = useState<string | null>(null);   // texto completo (para copiar)
  const [aiAnalise,   setAiAnalise]   = useState<string | null>(null);   // só o texto da IA
  const [aiMetricas,  setAiMetricas]  = useState<AiMetricas | null>(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState<string | null>(null);
  const [aiType,      setAiType]      = useState<"daily" | "weekly" | "monthly" | null>(null);
  const [aiCopied,    setAiCopied]    = useState(false);
  const [aiExpanded,  setAiExpanded]  = useState(true);

  // ── contexto da equipe para a IA ──────────────────────────────────────────
  const [aiContext,        setAiContext]        = useState("");
  const [aiContextOpen,    setAiContextOpen]    = useState(false);
  const [aiContextSaving,  setAiContextSaving]  = useState(false);
  const [aiContextSaved,   setAiContextSaved]   = useState(false);

  // Carrega o contexto salvo ao montar
  useEffect(() => {
    apiFetch<{ context: string }>("/support-tickets/ai-context")
      .then(r => setAiContext(r.context))
      .catch(() => {});
  }, []);

  const saveAiContext = useCallback(async () => {
    setAiContextSaving(true);
    try {
      await apiFetch("/support-tickets/ai-context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: aiContext }),
      });
      setAiContextSaved(true);
      setTimeout(() => setAiContextSaved(false), 2500);
    } finally {
      setAiContextSaving(false);
    }
  }, [aiContext]);

  // ── rotinas ────────────────────────────────────────────────────────────────
  const [routinePanelOpen, setRoutinePanelOpen] = useState(false);

  // ── IA — chat ─────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput,    setChatInput]    = useState("");
  const [chatLoading,  setChatLoading]  = useState(false);
  const [chatOpen,     setChatOpen]     = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── departamentos ─────────────────────────────────────────────────────────
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: listDepartments,
  });

  const deptMap = useMemo(
    () => new Map(departments.map((d) => [d.erpCode, d.name])),
    [departments]
  );

  const deptLabel = useMemo(() => {
    if (selectedDepts.length === 0) return "Todos os Departamentos";
    if (selectedDepts.length === 1) return deptMap.get(selectedDepts[0]) ?? selectedDepts[0];
    return `${selectedDepts.length} departamentos`;
  }, [selectedDepts, deptMap]);

  // ── query de tickets ──────────────────────────────────────────────────────
  const skip = (page - 1) * PAGE_SIZE;

  const { data, isPending, isFetching, isError } = useQuery({
    queryKey: ["support-tickets", appliedFilters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("dateFrom", `${appliedFilters.dateFrom}T00:00:00`);
      params.append("dateTo",   `${appliedFilters.dateTo}T23:59:59`);
      params.append("take", String(PAGE_SIZE));
      params.append("skip", String(skip));
      if (appliedFilters.departamentos.length > 0) {
        params.append("departamento", appliedFilters.departamentos.join(","));
      }
      if (appliedFilters.usuAtend.trim()) params.append("usuAtend", appliedFilters.usuAtend.trim());
      return apiFetch<SupportTicketsResponse>(`/support-tickets?${params.toString()}`);
    },
    enabled: hasSearched,
    retry: 1,
  });

  const isLoading  = isPending && isFetching;
  const items      = data?.items ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleSearch = () => {
    setPage(1);
    setHasSearched(true);
    setAppliedFilters({
      dateFrom:      dateFromInput,
      dateTo:        dateToInput,
      departamentos: selectedDepts,
      usuAtend:      usuAtendInput,
    });
  };

  const toggleDept = (erpCode: string) => {
    setSelectedDepts(prev =>
      prev.includes(erpCode) ? prev.filter(d => d !== erpCode) : [...prev, erpCode]
    );
  };

  // ── IA — relatório ────────────────────────────────────────────────────────
  const generateAIReport = async (type: "daily" | "weekly" | "monthly") => {
    setAiLoading(true);
    setAiError(null);
    setAiReport(null);
    setAiAnalise(null);
    setAiMetricas(null);
    setAiType(type);
    setAiExpanded(true);
    setChatMessages([]);
    setChatOpen(false);
    try {
      const result = await apiFetch<{ report: string; analise: string; metricas: AiMetricas }>(
        "/support-tickets/ai-report",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dateFrom:      `${dateFromInput}T00:00:00`,
            dateTo:        `${dateToInput}T23:59:59`,
            reportType:    type,
            departamentos: selectedDepts.length > 0 ? selectedDepts : undefined,
            usuAtend:      usuAtendInput.trim() || undefined,
          }),
        }
      );
      setAiReport(result.report);
      setAiAnalise(result.analise);
      setAiMetricas(result.metricas ?? null);
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : "Erro ao gerar relatório");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!aiReport) return;
    navigator.clipboard.writeText(aiReport);
    setAiCopied(true);
    setTimeout(() => setAiCopied(false), 2000);
  };

  // ── IA — chat ─────────────────────────────────────────────────────────────
  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const result = await apiFetch<{ reply: string }>("/support-tickets/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          context: aiReport ?? undefined,
        }),
      });
      setChatMessages(prev => [...prev, { role: "assistant", content: result.reply }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Erro ao obter resposta. Tente novamente." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── helpers de formatação ─────────────────────────────────────────────────
  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    try { return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR }); }
    catch { return iso; }
  };

  const displayDate = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const resolveDept = (erpCode: string | null): string => {
    if (!erpCode) return "—";
    return deptMap.get(erpCode) ?? erpCode;
  };

  const renderNota = (nota: number | null) => {
    if (nota == null) return <span className="text-muted-foreground">—</span>;
    const stars = Math.round(nota);
    return (
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-3 h-3 ${i < stars ? "fill-yellow-400 text-yellow-400" : "text-muted"}`} />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">({nota})</span>
      </span>
    );
  };

  const avgNota = items.filter(t => t.nota != null).length > 0
    ? (items.reduce((s, t) => s + (t.nota ?? 0), 0) / items.filter(t => t.nota != null).length).toFixed(1)
    : "—";

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatório de Atendimentos</h2>
          <p className="text-muted-foreground">Listagem dos atendimentos finalizados importados do sistema Analytics.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setRoutinePanelOpen(true)}
          className="gap-2 shrink-0"
        >
          <Bell className="w-4 h-4" />
          Rotinas
        </Button>
      </div>

      {/* Painel de Rotinas */}
      <RoutinePanel
        open={routinePanelOpen}
        onClose={() => setRoutinePanelOpen(false)}
        context="supportTickets"
        contextLabel="Relatório de Atendimentos"
      />

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium">Data Inicial</label>
              <DateInputPicker value={dateFromInput} onChange={setDateFromInput} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Data Final</label>
              <DateInputPicker value={dateToInput} onChange={setDateToInput} />
            </div>

            {/* Multi-select departamentos */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Departamento</label>
              <Popover open={deptPopoverOpen} onOpenChange={setDeptPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[220px] justify-between font-normal text-sm">
                    <span className="truncate">{deptLabel}</span>
                    <ChevronDown className="w-4 h-4 shrink-0 ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-2" align="start">
                  <div className="space-y-1">
                    <button
                      className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                      onClick={() => setSelectedDepts([])}
                    >
                      <Checkbox checked={selectedDepts.length === 0} readOnly />
                      Todos os Departamentos
                    </button>
                    {departments.length === 0 && (
                      <div className="px-2 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
                        <Settings className="w-3 h-3" />
                        Nenhum departamento cadastrado
                      </div>
                    )}
                    {departments.map((dept) => (
                      <button
                        key={dept.id}
                        className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                        onClick={() => toggleDept(dept.erpCode)}
                      >
                        <Checkbox checked={selectedDepts.includes(dept.erpCode)} readOnly />
                        {dept.name}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Técnico Responsável</label>
              <Input
                type="text"
                placeholder="Nome do técnico..."
                value={usuAtendInput}
                onChange={(e) => setUsuAtendInput(e.target.value)}
                className="w-44"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="mb-0.5">
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total de Atendimentos</p>
                <p className="text-2xl font-bold text-foreground">{total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Nota Média</p>
                <p className="text-2xl font-bold text-foreground">{avgNota}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Página {page} de {totalPages}</p>
                <p className="text-2xl font-bold text-foreground">{items.length} / {total}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[90px]">Protocolo</TableHead>
                <TableHead>Finalização</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Ponto de Venda</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Procedimentos</TableHead>
                <TableHead className="w-[80px]">Tempo</TableHead>
                <TableHead className="w-[120px]">Nota</TableHead>
                <TableHead className="min-w-[200px]">Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                    Carregando atendimentos...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-10 text-destructive">
                    Erro ao carregar relatório. Tente novamente.
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                    {hasSearched
                      ? "Nenhum atendimento encontrado para o período."
                      : <>Nenhum atendimento encontrado. Clique em <strong>Buscar</strong> para pesquisar.</>}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{t.protocolo || `#${t.externalId}`}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatDate(t.dataHoraFinalizacao)}</TableCell>
                    <TableCell className="max-w-[160px]">
                      <div className="truncate font-medium text-sm" title={t.nomeCli ?? undefined}>
                        {t.nomeCli || t.nomeClienteAtendimento || "—"}
                      </div>
                      {t.numeroCliente && (
                        <div className="text-xs text-muted-foreground">{t.numeroCliente}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{t.cidRes || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate" title={t.pontoRevenda ?? undefined}>
                      {t.pontoRevenda || "—"}
                    </TableCell>
                    <TableCell>
                      {t.departamento ? (
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {resolveDept(t.departamento)}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{t.usuAtend || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[180px]">
                      {t.nomesProcedimento ? (
                        <span className="truncate block" title={t.nomesProcedimento}>
                          {t.nomesProcedimento}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-center">{t.tempoAtendimento || "—"}</TableCell>
                    <TableCell>{renderNota(t.nota)}</TableCell>
                    <TableCell className="text-xs max-w-[240px]">
                      {t.obsAtendimento ? (
                        <span
                          className="block truncate cursor-help text-muted-foreground"
                          title={t.obsAtendimento}
                        >
                          {t.obsAtendimento}
                        </span>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {total > 0 && (
          <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Exibindo {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} de {total} atendimentos
              {" · "}Período: {displayDate(appliedFilters.dateFrom)} até {displayDate(appliedFilters.dateTo)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage(1)}
                className="w-8 h-8 p-0"
              >
                <ChevronLeft className="w-3 h-3" /><ChevronLeft className="w-3 h-3 -ml-2" />
              </Button>
              <Button
                variant="outline" size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage(p => p - 1)}
                className="w-8 h-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs px-3 py-1 rounded border bg-muted font-medium">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage(p => p + 1)}
                className="w-8 h-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline" size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage(totalPages)}
                className="w-8 h-8 p-0"
              >
                <ChevronRight className="w-3 h-3" /><ChevronRight className="w-3 h-3 -ml-2" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* IA — Análise Inteligente */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Análise com Inteligência Artificial</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gere um relatório inteligente para o período selecionado nos filtros acima
                </p>
              </div>
            </div>
            {aiReport && (
              <button onClick={() => setAiExpanded(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                {aiExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Painel de contexto da equipe */}
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/30 transition-colors rounded-lg"
              onClick={() => setAiContextOpen(v => !v)}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Contexto da Equipe</span>
                {aiContext.trim() && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">Configurado</Badge>
                )}
              </div>
              {aiContextOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {aiContextOpen && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Descreva o perfil de cada atendente, suas funções e características. A IA usará esse contexto para personalizar a análise.
                  <br />
                  <span className="font-medium">Ex:</span> "DIEGO: técnico sênior, atende casos complexos de NF-e. LORENA: suporte nível 1, foco em atendimentos rápidos..."
                </p>
                <Textarea
                  placeholder={"Escreva aqui o contexto da sua equipe...\n\nExemplo:\nDIEGO: Técnico sênior, especialista em NF-e e integrações fiscais. Atende os clientes mais complexos.\nLORENA: Atendente nível 1, foco em chamados de boleto e configuração de API PIX.\nERICLES: Estagiário em treinamento, ainda em adaptação ao sistema..."}
                  value={aiContext}
                  onChange={e => setAiContext(e.target.value)}
                  rows={8}
                  className="text-sm resize-y font-mono"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {aiContext.length} caracteres
                  </span>
                  <Button
                    size="sm"
                    onClick={saveAiContext}
                    disabled={aiContextSaving}
                    className="gap-2"
                  >
                    {aiContextSaving
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : aiContextSaved
                      ? <Check className="w-4 h-4 text-green-400" />
                      : <Save className="w-4 h-4" />}
                    {aiContextSaved ? "Salvo!" : "Salvar Contexto"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Botões de tipo */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={aiType === "daily" ? "default" : "outline"}
              size="sm" disabled={aiLoading}
              onClick={() => generateAIReport("daily")}
              className="gap-2"
            >
              {aiLoading && aiType === "daily" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
              Relatório Diário
            </Button>
            <Button
              variant={aiType === "weekly" ? "default" : "outline"}
              size="sm" disabled={aiLoading}
              onClick={() => generateAIReport("weekly")}
              className="gap-2"
            >
              {aiLoading && aiType === "weekly" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />}
              Relatório Semanal
            </Button>
            <Button
              variant={aiType === "monthly" ? "default" : "outline"}
              size="sm" disabled={aiLoading}
              onClick={() => generateAIReport("monthly")}
              className="gap-2"
            >
              {aiLoading && aiType === "monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              Relatório Mensal
            </Button>

            {aiReport && !aiLoading && (
              <>
                <Button variant="ghost" size="sm" onClick={handleCopyReport} className="gap-2">
                  {aiCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {aiCopied ? "Copiado!" : "Copiar"}
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => { setChatOpen(v => !v); }}
                  className="gap-2 ml-auto"
                >
                  <MessageSquare className="w-4 h-4" />
                  {chatOpen ? "Fechar Chat" : "Perguntar à IA"}
                </Button>
              </>
            )}
          </div>

          {/* Loading */}
          {aiLoading && (
            <div className="flex items-center gap-3 py-6 text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Analisando atendimentos e gerando relatório, aguarde...</span>
            </div>
          )}

          {/* Erro */}
          {aiError && !aiLoading && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {aiError}
            </div>
          )}

          {/* Dashboard de métricas (gerada pelos dados, não pela IA) */}
          {aiMetricas && !aiLoading && aiExpanded && (
            <SupportDashboard m={aiMetricas} />
          )}

          {/* Análise textual da IA */}
          {aiAnalise && !aiLoading && aiExpanded && (
            <div className="rounded-lg border bg-muted/30 p-5">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Análise da Inteligência Artificial</span>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {aiAnalise}
              </pre>
            </div>
          )}

          {/* Chat de perguntas sobre o relatório */}
          {aiReport && !aiLoading && chatOpen && (
            <div className="rounded-lg border bg-background flex flex-col" style={{ maxHeight: 420 }}>
              {/* Header do chat */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Tire dúvidas sobre o relatório
                </div>
                <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 300 }}>
                {chatMessages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Faça perguntas sobre os dados do relatório gerado acima.<br />
                    Ex: "Quem é o técnico com mais chamados?" ou "Qual cliente mais abriu tickets?"
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analisando...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-3 flex gap-2">
                <Input
                  placeholder="Digite sua pergunta sobre o relatório..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  disabled={chatLoading}
                  className="flex-1 text-sm"
                />
                <Button size="sm" onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="gap-2">
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {!aiReport && !aiLoading && !aiError && (
            <p className="text-xs text-muted-foreground py-2">
              Selecione o período nos filtros acima e clique em um dos botões para gerar a análise.
              A IA irá calcular métricas, identificar padrões e gerar um relatório simples e claro.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
