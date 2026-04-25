import React, { useMemo, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, Search, AlertTriangle, TrendingDown, BarChart3, Clock, Users, Target, RefreshCw, Info, Activity } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getAging,
  getDelinquencyByCustomer,
  getDso,
  getBilledVsReceived,
  getReceivableForecast,
  getAtRiskCustomers,
  getChurnAnalysis,
  getCohortAnalysis,
  getPaymentBehaviorChange,
  getBehaviorFullAnalysis,
  type AgingResponse,
  type AgingItem,
  type DsoMonth,
  type DeterioratingItem,
  type OnLimitItem,
  type StoppedAnticipatorsItem,
  type IncreasingOpenItem,
  type RecurringSmallItem,
  type AlternatingItem,
  type ReducedPurchasesItem,
  type ConcentratedItem,
  type CriticalRiskItem,
  type RecoveredItem,
  type BehaviorFullResponse,
  type PaymentBehaviorResponse,
} from "@/api/financialReports";
import { downloadCsv } from "@/utils/csv";
import { downloadXlsx } from "@/utils/xlsx";
import { DateInputPicker } from "@/components/ui/DateInputPicker";

// ─── Utilitários ─────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtN = (v: number) => v.toLocaleString("pt-BR");
const today = () => format(new Date(), "yyyy-MM-dd");
const monthStart = (offset = 0) =>
  format(subMonths(new Date(new Date().getFullYear(), new Date().getMonth(), 1), offset), "yyyy-MM-dd");

function ptDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const bucketColors: Record<string, string> = {
  future:  "bg-green-100 text-green-800",
  d1_30:   "bg-yellow-100 text-yellow-800",
  d31_60:  "bg-orange-100 text-orange-800",
  d61_90:  "bg-red-100 text-red-800",
  d91plus: "bg-red-200 text-red-900 font-semibold",
};
const bucketLabels: Record<string, string> = {
  future:  "A Vencer",
  d1_30:   "1-30 dias",
  d31_60:  "31-60 dias",
  d61_90:  "61-90 dias",
  d91plus: "+90 dias",
};
const riskColors: Record<string, string> = {
  HIGH:   "bg-red-100 text-red-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW:    "bg-green-100 text-green-800",
};
const riskLabels: Record<string, string> = {
  HIGH: "Alto", MEDIUM: "Médio", LOW: "Baixo",
};

/** Retorna nome fantasia quando disponível, senão razão social */
const dn = (item: { customerName: string; knownName?: string | null }) =>
  item.knownName?.trim() || item.customerName;

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FinancialReports() {
  const [tab, setTab] = useState("aging");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Relatórios Financeiros</h2>
        <p className="text-muted-foreground">
          Aging, DSO, inadimplência, forecast, churn e análise de cohort.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="aging" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Aging AR
          </TabsTrigger>
          <TabsTrigger value="delinquency" className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> Inadimplência
          </TabsTrigger>
          <TabsTrigger value="dso" className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5" /> DSO
          </TabsTrigger>
          <TabsTrigger value="billed" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Faturado x Recebido
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-1.5 text-xs">
            <Target className="w-3.5 h-3.5" /> Previsão
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> Clientes em Risco
          </TabsTrigger>
          <TabsTrigger value="churn" className="flex items-center gap-1.5 text-xs">
            <TrendingDown className="w-3.5 h-3.5" /> Churn
          </TabsTrigger>
          <TabsTrigger value="cohort" className="flex items-center gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Cohort
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-1.5 text-xs">
            <Activity className="w-3.5 h-3.5" /> Comportamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aging" className="mt-4"><AgingTab /></TabsContent>
        <TabsContent value="delinquency" className="mt-4"><DelinquencyTab /></TabsContent>
        <TabsContent value="dso" className="mt-4"><DsoTab /></TabsContent>
        <TabsContent value="billed" className="mt-4"><BilledVsReceivedTab /></TabsContent>
        <TabsContent value="forecast" className="mt-4"><ForecastTab /></TabsContent>
        <TabsContent value="risk" className="mt-4"><AtRiskTab /></TabsContent>
        <TabsContent value="churn" className="mt-4"><ChurnTab /></TabsContent>
        <TabsContent value="cohort" className="mt-4"><CohortTab /></TabsContent>
        <TabsContent value="behavior" className="mt-4"><BehaviorChangeTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DIAGNÓSTICO DE AGING
// ════════════════════════════════════════════════════════════════════════════

type DiagInsight = { level: "ok" | "warn" | "danger"; text: string };

function AgingDiagnosis({
  buckets,
  items,
  total,
}: {
  buckets: AgingResponse["buckets"];
  items: AgingItem[];
  total: number;
}) {
  const overdue     = buckets.d1_30.amount + buckets.d31_60.amount + buckets.d61_90.amount + buckets.d91plus.amount;
  const overdueCount= buckets.d1_30.count  + buckets.d31_60.count  + buckets.d61_90.count  + buckets.d91plus.count;
  const critical    = buckets.d61_90.amount + buckets.d91plus.amount;
  const overdueRate = total > 0 ? overdue / total : 0;
  const criticalRate= total > 0 ? critical / total : 0;
  const d91Rate     = total > 0 ? buckets.d91plus.amount / total : 0;

  const health =
    overdueRate === 0   ? "healthy" :
    overdueRate < 0.05  ? "healthy" :
    overdueRate < 0.15  ? "warning" : "critical";

  const healthConfig = {
    healthy: { label: "Saudável",  border: "border-l-green-500",  badge: "bg-green-100 text-green-800",  icon: "🟢" },
    warning: { label: "Atenção",   border: "border-l-yellow-500", badge: "bg-yellow-100 text-yellow-800", icon: "🟡" },
    critical:{ label: "Crítico",   border: "border-l-red-500",    badge: "bg-red-100 text-red-800",       icon: "🔴" },
  }[health];

  // ── Insights dinâmicos ──────────────────────────────────────────────────
  const insights: DiagInsight[] = [];

  if (total === 0) {
    insights.push({ level: "ok", text: "Nenhum título em aberto encontrado para o filtro aplicado." });
  } else if (overdueRate === 0) {
    insights.push({ level: "ok", text: "Todos os títulos estão dentro do prazo. Carteira sem atrasos." });
  } else if (overdueRate < 0.05) {
    insights.push({ level: "ok", text: `Apenas ${fmtPct(overdueRate)} do saldo está em atraso — nível saudável.` });
  } else if (overdueRate < 0.15) {
    insights.push({ level: "warn", text: `${fmtPct(overdueRate)} do saldo (${fmt(overdue)}, ${overdueCount} título(s)) está em atraso — acompanhe de perto.` });
  } else {
    insights.push({ level: "danger", text: `${fmtPct(overdueRate)} do saldo (${fmt(overdue)}, ${overdueCount} título(s)) está em atraso — acione a régua de cobrança com urgência.` });
  }

  if (d91Rate > 0.15) {
    insights.push({ level: "danger", text: `${fmtPct(d91Rate)} do saldo (${fmt(buckets.d91plus.amount)}) vencido há mais de 90 dias — avalie negativação ou cessão de crédito.` });
  } else if (d91Rate > 0.05) {
    insights.push({ level: "danger", text: `${fmt(buckets.d91plus.amount)} vencidos há mais de 90 dias (${buckets.d91plus.count} título(s)) — risco elevado de perda definitiva.` });
  } else if (buckets.d91plus.count > 0) {
    insights.push({ level: "warn", text: `${buckets.d91plus.count} título(s) vencido(s) há mais de 90 dias (${fmt(buckets.d91plus.amount)}) — requer atenção.` });
  }

  if (criticalRate > 0.1 && d91Rate < criticalRate) {
    insights.push({ level: "warn", text: `${fmtPct(criticalRate)} do saldo (${fmt(critical)}) vencido há mais de 60 dias — priorize a cobrança desses títulos.` });
  }

  if (buckets.d1_30.count > 0 && buckets.d1_30.amount / total > 0.1) {
    insights.push({ level: "warn", text: `${fmt(buckets.d1_30.amount)} (${buckets.d1_30.count} título(s)) vencido(s) há até 30 dias — janela ideal para cobrança amigável.` });
  }

  if (buckets.future.amount > 0 && health === "healthy") {
    insights.push({ level: "ok", text: `${fmt(buckets.future.amount)} a vencer (${buckets.future.count} título(s)) — envie lembretes preventivos próximo ao vencimento.` });
  }

  // ── Cliente com maior exposição em risco ─────────────────────────────────
  const topRisk = items
    .filter((i) => i.bucket === "d91plus" || i.bucket === "d61_90")
    .sort((a, b) => b.openAmount - a.openAmount)[0];

  const insightIcon = { ok: "✅", warn: "⚠️", danger: "🚨" };

  return (
    <Card className={`border-l-4 ${healthConfig.border}`}>
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Diagnóstico Atual</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${healthConfig.badge}`}>
              {healthConfig.icon} {healthConfig.label}
            </span>
          </div>
          {total > 0 && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>
                Em atraso:{" "}
                <strong className={overdueRate > 0.15 ? "text-red-600" : overdueRate > 0.05 ? "text-yellow-600" : "text-green-600"}>
                  {fmtPct(overdueRate)}
                </strong>
              </span>
              <span>
                Crítico (&gt;60d):{" "}
                <strong className={criticalRate > 0.1 ? "text-red-600" : criticalRate > 0 ? "text-yellow-600" : "text-green-600"}>
                  {fmtPct(criticalRate)}
                </strong>
              </span>
              <span>
                +90 dias:{" "}
                <strong className={d91Rate > 0.1 ? "text-red-600" : d91Rate > 0 ? "text-yellow-600" : "text-green-600"}>
                  {fmtPct(d91Rate)}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Insights */}
        <ul className="space-y-1.5">
          {insights.map((ins, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0">{insightIcon[ins.level]}</span>
              <span className={ins.level === "danger" ? "text-red-700" : ins.level === "warn" ? "text-yellow-700" : "text-green-700"}>
                {ins.text}
              </span>
            </li>
          ))}
        </ul>

        {/* Cliente mais exposto */}
        {topRisk && (
          <div className="pt-1 border-t text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-foreground">Maior exposição em risco:</span>
            <span className="font-semibold text-red-600">{dn(topRisk)}</span>
            <span>— {fmt(topRisk.openAmount)} em aberto</span>
            <span className={`px-1.5 py-0.5 rounded ${bucketColors[topRisk.bucket]}`}>
              {bucketLabels[topRisk.bucket]}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — AGING DE CONTAS A RECEBER
// ════════════════════════════════════════════════════════════════════════════
function AgingTab() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [innerTab, setInnerTab] = useState("synthetic");

  const params = useMemo(() => ({ q: appliedSearch || undefined }), [appliedSearch]);

  const aging = useQuery({
    queryKey: ["financial-reports", "aging", params],
    enabled: hasSearched,
    queryFn: () => getAging(params),
  });

  const handleSearch = () => {
    setAppliedSearch(search);
    setHasSearched(true);
  };

  const buckets = aging.data?.buckets;
  const total = aging.data?.totals.amount ?? 0;

  const handleExport = () => {
    if (!aging.data) return;
    const headers = ["Bucket", "Cliente", "Razão Social", "Documento", "Vencimento", "Valor", "Em Aberto", "Dias Atraso"];
    const rows = aging.data.items.map((i) => [
      bucketLabels[i.bucket],
      dn(i),
      i.customerName,
      i.documentNumber || "",
      format(new Date(i.dueDate), "yyyy-MM-dd"),
      i.amount,
      i.openAmount,
      i.daysOverdue,
    ]);
    downloadXlsx("aging_ar.xlsx", headers, rows, "Aging AR", { currencyColumns: [4, 5], dateColumns: [3] });
    downloadCsv("aging_ar.csv", headers, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Aging de Contas a Receber</h3>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="O que é Aging?">
                  <Info className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm space-y-2" side="right">
                <p className="font-semibold">O que é Aging de Contas a Receber?</p>
                <p className="text-muted-foreground leading-relaxed">
                  Aging (ou "envelhecimento") é um relatório que classifica os títulos em aberto pelo tempo desde o vencimento, mostrando quanto está dentro do prazo e quanto está atrasado — e há quanto tempo.
                </p>
                <div className="space-y-1 text-muted-foreground">
                  <p className="font-medium text-foreground">Faixas usadas neste relatório:</p>
                  <p>🟢 <strong>A Vencer</strong> — títulos que ainda não venceram</p>
                  <p>🟡 <strong>1–30 dias</strong> — atraso recente</p>
                  <p>🟠 <strong>31–60 dias</strong> — atenção</p>
                  <p>🔴 <strong>61–90 dias</strong> — crítico</p>
                  <p>🔴 <strong>+90 dias</strong> — risco alto de inadimplência</p>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Use este relatório para priorizar cobranças e identificar clientes com histórico de atraso.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-sm text-muted-foreground">Distribuição dos títulos em aberto por faixa de vencimento.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!hasSearched}>
          <Download className="w-4 h-4 mr-2" /> Exportar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium">Buscar cliente</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome do cliente..." onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            </div>
            <Button onClick={handleSearch}><Search className="w-4 h-4 mr-2" />Buscar</Button>
          </div>
        </CardContent>
      </Card>

      {!hasSearched ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Clique em Buscar para carregar o aging.</CardContent></Card>
      ) : aging.isLoading ? (
        <Card><CardContent className="py-12 text-center">Carregando...</CardContent></Card>
      ) : aging.isError ? (
        <Card><CardContent className="py-12 text-center text-destructive">Erro ao carregar.</CardContent></Card>
      ) : (
        <>
          {/* Cards dos buckets */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {buckets && Object.entries(buckets).map(([key, b]) => (
              <Card key={key}>
                <CardContent className="p-3 text-center">
                  <div className={`text-xs font-medium mb-1 ${key === "future" ? "text-green-600" : key === "d1_30" ? "text-yellow-600" : key === "d31_60" ? "text-orange-600" : "text-red-600"}`}>
                    {b.label.toUpperCase()}
                  </div>
                  <div className="text-lg font-bold">{fmt(b.amount)}</div>
                  <div className="text-xs text-muted-foreground">{b.count} título(s)</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Diagnóstico automático */}
          {buckets && (
            <AgingDiagnosis
              buckets={buckets}
              items={aging.data?.items ?? []}
              total={total}
            />
          )}

          <Tabs value={innerTab} onValueChange={setInnerTab}>
            <TabsList>
              <TabsTrigger value="synthetic">Sintético</TabsTrigger>
              <TabsTrigger value="analytical">Analítico</TabsTrigger>
            </TabsList>
            <TabsContent value="synthetic" className="mt-3">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faixa</TableHead>
                      <TableHead className="text-right">Títulos</TableHead>
                      <TableHead className="text-right">Valor em Aberto</TableHead>
                      <TableHead className="text-right">% do Total</TableHead>
                      <TableHead>Barra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buckets && Object.entries(buckets).map(([key, b]) => (
                      <TableRow key={key}>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${bucketColors[key]}`}>{b.label}</span>
                        </TableCell>
                        <TableCell className="text-right">{fmtN(b.count)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(b.amount)}</TableCell>
                        <TableCell className="text-right">{total > 0 ? `${((b.amount / total) * 100).toFixed(1)}%` : "-"}</TableCell>
                        <TableCell>
                          <div className="w-full bg-muted rounded-full h-2 min-w-[80px]">
                            <div
                              className={`h-2 rounded-full ${key === "future" ? "bg-green-500" : key === "d1_30" ? "bg-yellow-500" : key === "d31_60" ? "bg-orange-500" : key === "d61_90" ? "bg-red-500" : "bg-red-800"}`}
                              style={{ width: total > 0 ? `${Math.min((b.amount / total) * 100, 100)}%` : "0%" }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-3 border-t text-sm text-muted-foreground">
                  Total em aberto: <span className="font-semibold text-foreground">{fmt(total)}</span> | {fmtN(aging.data?.totals.count ?? 0)} títulos
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="analytical" className="mt-3">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faixa</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Nº Doc</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Em Aberto</TableHead>
                      <TableHead className="text-right">Dias Atraso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(aging.data?.items.length ?? 0) === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sem títulos vencidos.</TableCell></TableRow>
                    ) : (
                      aging.data?.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${bucketColors[item.bucket]}`}>{bucketLabels[item.bucket]}</span>
                          </TableCell>
                          <TableCell>
                            <div>{dn(item)}</div>
                            {item.knownName?.trim() && <div className="text-xs text-muted-foreground">{item.customerName}</div>}
                          </TableCell>
                          <TableCell>{item.documentNumber || "-"}</TableCell>
                          <TableCell>{ptDate(item.dueDate)}</TableCell>
                          <TableCell className="text-right">{fmt(item.amount)}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(item.openAmount)}</TableCell>
                          <TableCell className="text-right">{item.daysOverdue < 0 ? `${Math.abs(item.daysOverdue)}d` : `${item.daysOverdue}d`}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="p-3 border-t text-sm text-muted-foreground">
                  {fmtN(aging.data?.totals.count ?? 0)} títulos | Total: {fmt(total)}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — INADIMPLÊNCIA POR CLIENTE
// ════════════════════════════════════════════════════════════════════════════
function DelinquencyTab() {
  const [search, setSearch] = useState("");
  const [top, setTop] = useState("100");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedTop, setAppliedTop] = useState(100);
  const [hasSearched, setHasSearched] = useState(false);

  const params = useMemo(() => ({ q: appliedSearch || undefined, top: appliedTop }), [appliedSearch, appliedTop]);

  const data = useQuery({
    queryKey: ["financial-reports", "delinquency", params],
    enabled: hasSearched,
    queryFn: () => getDelinquencyByCustomer(params),
  });

  const handleSearch = () => {
    setAppliedSearch(search);
    setAppliedTop(Number(top));
    setHasSearched(true);
  };

  const handleExport = () => {
    if (!data.data) return;
    const headers = ["Cliente", "Razão Social", "CPF/CNPJ", "Total Aberto", "Qtd Vencidos", "Atraso Médio (dias)", "Maior Atraso (dias)", "Último Pagamento"];
    const rows = data.data.items.map((i) => [dn(i), i.customerName, i.document || "", i.totalOpen, i.overdueCount, i.avgDelayDays, i.maxDelayDays, i.lastPaymentDate ? format(new Date(i.lastPaymentDate), "yyyy-MM-dd") : ""]);
    downloadXlsx("inadimplencia.xlsx", headers, rows, "Inadimplência", { currencyColumns: [2], dateColumns: [6] });
    downloadCsv("inadimplencia.csv", headers, rows);
  };

  const totals = data.data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Inadimplência por Cliente</h3>
          <p className="text-sm text-muted-foreground">Clientes com títulos vencidos e não pagos. Atraso médio e maior atraso.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!hasSearched}><Download className="w-4 h-4 mr-2" />Exportar</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-xs font-medium">Buscar cliente</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome do cliente..." onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Exibir top</label>
              <Select value={top} onValueChange={setTop}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                  <SelectItem value="500">Top 500</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch}><Search className="w-4 h-4 mr-2" />Buscar</Button>
          </div>
        </CardContent>
      </Card>

      {!hasSearched ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Clique em Buscar para carregar.</CardContent></Card>
      ) : data.isLoading ? (
        <Card><CardContent className="py-12 text-center">Carregando...</CardContent></Card>
      ) : data.isError ? (
        <Card><CardContent className="py-12 text-center text-destructive">Erro ao carregar.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TOTAL EM ABERTO</div><div className="text-2xl font-bold text-red-600">{fmt(totals?.totalOpen ?? 0)}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">CLIENTES INADIMPLENTES</div><div className="text-2xl font-bold">{fmtN(totals?.totalCustomers ?? 0)}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">ATRASO MÉDIO</div><div className="text-2xl font-bold">{totals?.avgDelayDays ?? 0} dias</div></CardContent></Card>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead className="text-right">Total Aberto</TableHead>
                  <TableHead className="text-right">Títulos Vencidos</TableHead>
                  <TableHead className="text-right">Atraso Médio</TableHead>
                  <TableHead className="text-right">Maior Atraso</TableHead>
                  <TableHead>Último Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.data?.items.length ?? 0) === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma inadimplência encontrada.</TableCell></TableRow>
                ) : (
                  data.data?.items.map((item, idx) => (
                    <TableRow key={item.customerId ?? idx}>
                      <TableCell className="font-medium">
                        <div>{dn(item)}</div>
                        {item.knownName?.trim() && <div className="text-xs text-muted-foreground">{item.customerName}</div>}
                      </TableCell>
                      <TableCell>{item.document || "-"}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">{fmt(item.totalOpen)}</TableCell>
                      <TableCell className="text-right">{item.overdueCount}</TableCell>
                      <TableCell className="text-right">{item.avgDelayDays}d</TableCell>
                      <TableCell className="text-right">{item.maxDelayDays}d</TableCell>
                      <TableCell>{ptDate(item.lastPaymentDate)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="p-3 border-t text-sm text-muted-foreground">{fmtN(data.data?.items.length ?? 0)} clientes | Total: {fmt(totals?.totalOpen ?? 0)}</div>
          </Card>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — DSO / PRAZO MÉDIO DE RECEBIMENTO
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// DIAGNÓSTICO DE DSO
// ════════════════════════════════════════════════════════════════════════════

function DsoDiagnosis({ months, avgDso }: { months: DsoMonth[]; avgDso: number }) {
  // ── Saúde geral com base no DSO médio ───────────────────────────────────
  const health =
    avgDso <= 30  ? "healthy" :
    avgDso <= 60  ? "warning" :
    avgDso <= 90  ? "danger"  : "critical";

  const healthConfig = {
    healthy:  { label: "Excelente", border: "border-l-green-500",  badge: "bg-green-100 text-green-800",   icon: "🟢" },
    warning:  { label: "Normal",    border: "border-l-blue-400",   badge: "bg-blue-100 text-blue-800",     icon: "🔵" },
    danger:   { label: "Elevado",   border: "border-l-yellow-500", badge: "bg-yellow-100 text-yellow-800", icon: "🟡" },
    critical: { label: "Crítico",   border: "border-l-red-500",    badge: "bg-red-100 text-red-800",       icon: "🔴" },
  }[health];

  // ── Tendência: compara média dos 3 primeiros vs 3 últimos meses ─────────
  const sorted = [...months].sort((a, b) => a.month.localeCompare(b.month));
  const n = sorted.length;
  const trend: "improving" | "worsening" | "stable" | null =
    n < 2 ? null : (() => {
      const slice = Math.max(1, Math.min(3, Math.floor(n / 2)));
      const firstAvg = sorted.slice(0, slice).reduce((s, m) => s + m.dso, 0) / slice;
      const lastAvg  = sorted.slice(-slice).reduce((s, m) => s + m.dso, 0) / slice;
      const delta = lastAvg - firstAvg;
      if (delta < -3) return "improving";
      if (delta >  3) return "worsening";
      return "stable";
    })();

  // ── Melhor e pior mês ───────────────────────────────────────────────────
  const bestMonth  = n > 0 ? sorted.reduce((a, b) => b.dso < a.dso ? b : a) : null;
  const worstMonth = n > 0 ? sorted.reduce((a, b) => b.dso > a.dso ? b : a) : null;

  // ── Aceleração recente: último mês vs média ─────────────────────────────
  const lastMonth = sorted[n - 1] ?? null;
  const lastDiff  = lastMonth ? lastMonth.dso - avgDso : 0;

  // ── Insights ────────────────────────────────────────────────────────────
  const insights: DiagInsight[] = [];

  if (n === 0) {
    insights.push({ level: "ok", text: "Nenhum título pago no período informado." });
  } else {
    // Nível geral
    if (avgDso <= 30) {
      insights.push({ level: "ok", text: `DSO médio de ${avgDso} dias — excelente. Recebimentos acontecem rapidamente após emissão.` });
    } else if (avgDso <= 60) {
      insights.push({ level: "ok", text: `DSO médio de ${avgDso} dias — dentro do padrão B2B aceitável (até 60 dias).` });
    } else if (avgDso <= 90) {
      insights.push({ level: "warn", text: `DSO médio de ${avgDso} dias — elevado. Considere antecipar vencimentos ou intensificar a cobrança preventiva.` });
    } else {
      insights.push({ level: "danger", text: `DSO médio de ${avgDso} dias — nível crítico. Clientes estão levando muito tempo para pagar. Revise a política de crédito e cobrança.` });
    }

    // Tendência
    if (trend === "worsening") {
      const firstSlice = Math.max(1, Math.min(3, Math.floor(n / 2)));
      const firstAvg = Math.round(sorted.slice(0, firstSlice).reduce((s, m) => s + m.dso, 0) / firstSlice);
      const lastAvg  = Math.round(sorted.slice(-firstSlice).reduce((s, m) => s + m.dso, 0) / firstSlice);
      insights.push({ level: "danger", text: `Tendência de piora: DSO subiu de ~${firstAvg}d (início) para ~${lastAvg}d (período recente) — verifique se há acúmulo de títulos em aberto.` });
    } else if (trend === "improving") {
      const firstSlice = Math.max(1, Math.min(3, Math.floor(n / 2)));
      const firstAvg = Math.round(sorted.slice(0, firstSlice).reduce((s, m) => s + m.dso, 0) / firstSlice);
      const lastAvg  = Math.round(sorted.slice(-firstSlice).reduce((s, m) => s + m.dso, 0) / firstSlice);
      insights.push({ level: "ok", text: `Tendência de melhora: DSO caiu de ~${firstAvg}d para ~${lastAvg}d no período — boas práticas de cobrança estão surtindo efeito.` });
    } else if (trend === "stable" && n >= 2) {
      insights.push({ level: "ok", text: `DSO estável ao longo do período — comportamento de pagamento consistente.` });
    }

    // Último mês vs média
    if (lastMonth && Math.abs(lastDiff) > 5) {
      if (lastDiff > 0) {
        insights.push({ level: "warn", text: `O mês mais recente (${lastMonth.month}) está ${lastDiff}d acima da média — sinal de alerta para o fluxo de caixa atual.` });
      } else {
        insights.push({ level: "ok", text: `O mês mais recente (${lastMonth.month}) está ${Math.abs(lastDiff)}d abaixo da média — recebimentos aceleraram recentemente.` });
      }
    }

    // Melhor e pior mês
    if (bestMonth && worstMonth && bestMonth.month !== worstMonth.month) {
      insights.push({ level: "ok", text: `Melhor mês: ${bestMonth.month} (${bestMonth.dso}d) · Pior mês: ${worstMonth.month} (${worstMonth.dso}d) — variação de ${worstMonth.dso - bestMonth.dso} dias.` });
    }
  }

  const insightIcon = { ok: "✅", warn: "⚠️", danger: "🚨" };

  return (
    <Card className={`border-l-4 ${healthConfig.border}`}>
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Diagnóstico Atual</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${healthConfig.badge}`}>
              {healthConfig.icon} {healthConfig.label}
            </span>
          </div>
          {n > 0 && (
            <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
              <span>
                DSO médio:{" "}
                <strong className={avgDso > 90 ? "text-red-600" : avgDso > 60 ? "text-yellow-600" : avgDso > 30 ? "text-blue-600" : "text-green-600"}>
                  {avgDso}d
                </strong>
              </span>
              {trend && (
                <span>
                  Tendência:{" "}
                  <strong className={trend === "worsening" ? "text-red-600" : trend === "improving" ? "text-green-600" : "text-muted-foreground"}>
                    {trend === "worsening" ? "↑ Piorando" : trend === "improving" ? "↓ Melhorando" : "→ Estável"}
                  </strong>
                </span>
              )}
              {bestMonth && worstMonth && (
                <span>Variação: <strong>{bestMonth.dso}d – {worstMonth.dso}d</strong></span>
              )}
            </div>
          )}
        </div>

        {/* Insights */}
        <ul className="space-y-1.5">
          {insights.map((ins, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0">{insightIcon[ins.level]}</span>
              <span className={ins.level === "danger" ? "text-red-700" : ins.level === "warn" ? "text-yellow-700" : "text-green-700"}>
                {ins.text}
              </span>
            </li>
          ))}
        </ul>

        {/* Referência de benchmarks */}
        {n > 0 && (
          <div className="pt-1 border-t text-xs text-muted-foreground flex flex-wrap gap-3">
            <span className="text-green-700 font-medium">≤ 30d: Excelente</span>
            <span className="text-blue-700 font-medium">31–60d: Normal</span>
            <span className="text-yellow-700 font-medium">61–90d: Elevado</span>
            <span className="text-red-700 font-medium">&gt; 90d: Crítico</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DsoTab() {
  const [dateFrom, setDateFrom] = useState(monthStart(11));
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState<{ dateFrom: string; dateTo: string } | null>(null);

  const data = useQuery({
    queryKey: ["financial-reports", "dso", applied],
    enabled: !!applied,
    queryFn: () => getDso(applied!),
  });

  const handleSearch = () => setApplied({ dateFrom, dateTo });

  const handleExport = () => {
    if (!data.data) return;
    const headers = ["Mês", "DSO (dias)", "Qtd Títulos", "Total Recebido"];
    const rows = data.data.months.map((m) => [m.month, m.dso, m.count, m.totalPaid]);
    downloadXlsx("dso_mensal.xlsx", headers, rows, "DSO", { currencyColumns: [3] });
    downloadCsv("dso_mensal.csv", headers, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">DSO — Prazo Médio de Recebimento</h3>
          <p className="text-sm text-muted-foreground">Tempo médio (dias) entre emissão e pagamento dos títulos. Quanto menor, melhor.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!applied}><Download className="w-4 h-4 mr-2" />Exportar</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">De</label>
              <DateInputPicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Até</label>
              <DateInputPicker value={dateTo} onChange={setDateTo} />
            </div>
            <Button onClick={handleSearch}><Search className="w-4 h-4 mr-2" />Buscar</Button>
          </div>
        </CardContent>
      </Card>

      {!applied ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione o período e clique em Buscar.</CardContent></Card>
      ) : data.isLoading ? (
        <Card><CardContent className="py-12 text-center">Carregando...</CardContent></Card>
      ) : data.isError ? (
        <Card><CardContent className="py-12 text-center text-destructive">Erro ao carregar.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">DSO MÉDIO GERAL</div><div className="text-3xl font-bold text-blue-600">{data.data?.overall.avgDso ?? 0} dias</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TÍTULOS ANALISADOS</div><div className="text-3xl font-bold">{fmtN(data.data?.overall.totalCount ?? 0)}</div></CardContent></Card>
          </div>

          {/* Diagnóstico automático */}
          {data.data && (
            <DsoDiagnosis
              months={data.data.months}
              avgDso={data.data.overall.avgDso}
            />
          )}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">DSO (dias)</TableHead>
                  <TableHead className="text-right">Qtd Títulos</TableHead>
                  <TableHead className="text-right">Total Recebido</TableHead>
                  <TableHead>Indicador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.data?.months.length ?? 0) === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum título pago no período.</TableCell></TableRow>
                ) : (
                  data.data?.months.map((m) => {
                    const avg = data.data!.overall.avgDso;
                    const diff = m.dso - avg;
                    return (
                      <TableRow key={m.month}>
                        <TableCell className="font-medium">{m.month}</TableCell>
                        <TableCell className="text-right font-bold">{m.dso}d</TableCell>
                        <TableCell className="text-right">{fmtN(m.count)}</TableCell>
                        <TableCell className="text-right">{fmt(m.totalPaid)}</TableCell>
                        <TableCell>
                          <span className={`text-xs ${diff <= 0 ? "text-green-600" : "text-red-600"}`}>
                            {diff <= 0 ? `▼ ${Math.abs(diff)}d abaixo da média` : `▲ ${diff}d acima da média`}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="p-3 border-t text-sm text-muted-foreground">DSO médio: {data.data?.overall.avgDso ?? 0} dias | {fmtN(data.data?.overall.totalCount ?? 0)} títulos analisados</div>
          </Card>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 4 — FATURADO x RECEBIDO
// ════════════════════════════════════════════════════════════════════════════
function BilledVsReceivedTab() {
  const [dateFrom, setDateFrom] = useState(monthStart(11));
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState<{ dateFrom: string; dateTo: string } | null>(null);

  const data = useQuery({
    queryKey: ["financial-reports", "billed-vs-received", applied],
    enabled: !!applied,
    queryFn: () => getBilledVsReceived(applied!),
  });

  const handleSearch = () => setApplied({ dateFrom, dateTo });

  const [viewTab, setViewTab] = useState<"month" | "year">("month");

  // Agrupamento anual calculado a partir dos dados mensais
  const yearlyData = useMemo(() => {
    if (!data.data?.months) return [];
    const map = new Map<string, { billed: number; received: number; gap: number; months: number }>();
    for (const m of data.data.months) {
      const year = m.month.substring(0, 4);
      const entry = map.get(year) ?? { billed: 0, received: 0, gap: 0, months: 0 };
      entry.billed   += m.billed;
      entry.received += m.received;
      entry.gap      += m.gap;
      entry.months++;
      map.set(year, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, d]) => ({ year, ...d }));
  }, [data.data]);

  const handleExport = () => {
    if (!data.data) return;
    if (viewTab === "month") {
      const headers = ["Mês", "Faturado", "Recebido", "Gap", "% Recebido"];
      const rows = data.data.months.map((m) => [m.month, m.billed, m.received, m.gap, m.billed > 0 ? `${((m.received / m.billed) * 100).toFixed(1)}%` : "0%"]);
      downloadXlsx("faturado_x_recebido_mensal.xlsx", headers, rows, "Por Mês", { currencyColumns: [1, 2, 3] });
      downloadCsv("faturado_x_recebido_mensal.csv", headers, rows);
    } else {
      const headers = ["Ano", "Faturado", "Recebido", "Gap", "% Recebido", "Meses"];
      const rows = yearlyData.map((y) => [y.year, y.billed, y.received, y.gap, y.billed > 0 ? `${((y.received / y.billed) * 100).toFixed(1)}%` : "0%", y.months]);
      downloadXlsx("faturado_x_recebido_anual.xlsx", headers, rows, "Por Ano", { currencyColumns: [1, 2, 3] });
      downloadCsv("faturado_x_recebido_anual.csv", headers, rows);
    }
  };

  const totals = data.data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Faturado × Recebido</h3>
          <p className="text-sm text-muted-foreground">Comparação entre receita gerada (emissão) e receita efetivamente recebida (pagamento).</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!applied}><Download className="w-4 h-4 mr-2" />Exportar</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">De</label>
              <DateInputPicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Até</label>
              <DateInputPicker value={dateTo} onChange={setDateTo} />
            </div>
            <Button onClick={handleSearch}><Search className="w-4 h-4 mr-2" />Buscar</Button>
          </div>
        </CardContent>
      </Card>

      {!applied ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione o período e clique em Buscar.</CardContent></Card>
      ) : data.isLoading ? (
        <Card><CardContent className="py-12 text-center">Carregando...</CardContent></Card>
      ) : data.isError ? (
        <Card><CardContent className="py-12 text-center text-destructive">Erro ao carregar.</CardContent></Card>
      ) : (
        <>
          {/* Totais gerais */}
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TOTAL FATURADO</div><div className="text-xl font-bold text-blue-600">{fmt(totals?.billed ?? 0)}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TOTAL RECEBIDO</div><div className="text-xl font-bold text-green-600">{fmt(totals?.received ?? 0)}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">GAP (NÃO RECEBIDO)</div><div className="text-xl font-bold text-red-600">{fmt(totals?.gap ?? 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Taxa geral: <span className="font-semibold text-foreground">{totals?.billed ? `${((totals.received / totals.billed) * 100).toFixed(1)}%` : "-"}</span>
              </div>
            </CardContent></Card>
          </div>

          {/* Abas Mês / Ano */}
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as "month" | "year")}>
            <TabsList>
              <TabsTrigger value="month">Por Mês</TabsTrigger>
              <TabsTrigger value="year">Por Ano</TabsTrigger>
            </TabsList>

            {/* ── Por Mês ─────────────────────────────────────── */}
            <TabsContent value="month" className="mt-3">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Faturado</TableHead>
                      <TableHead className="text-right">Recebido</TableHead>
                      <TableHead className="text-right">Gap</TableHead>
                      <TableHead className="text-right">% Recebido</TableHead>
                      <TableHead>Eficiência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.data?.months.length ?? 0) === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum dado no período.</TableCell></TableRow>
                    ) : (
                      data.data?.months.map((m) => {
                        const pct = m.billed > 0 ? (m.received / m.billed) * 100 : 0;
                        return (
                          <TableRow key={m.month}>
                            <TableCell className="font-medium">{m.month}</TableCell>
                            <TableCell className="text-right">{fmt(m.billed)}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">{fmt(m.received)}</TableCell>
                            <TableCell className={`text-right font-medium ${m.gap > 0 ? "text-red-600" : "text-green-600"}`}>{m.gap > 0 ? fmt(m.gap) : `-${fmt(Math.abs(m.gap))}`}</TableCell>
                            <TableCell className="text-right font-medium">{pct.toFixed(1)}%</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[80px]">
                                <div className="flex-1 bg-muted rounded-full h-2">
                                  <div className={`h-2 rounded-full ${pct >= 90 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <div className="p-3 border-t text-sm text-muted-foreground">
                  {data.data?.months.length ?? 0} meses no período
                </div>
              </Card>
            </TabsContent>

            {/* ── Por Ano ──────────────────────────────────────── */}
            <TabsContent value="year" className="mt-3">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ano</TableHead>
                      <TableHead className="text-right">Faturado</TableHead>
                      <TableHead className="text-right">Recebido</TableHead>
                      <TableHead className="text-right">Gap</TableHead>
                      <TableHead className="text-right">% Recebido</TableHead>
                      <TableHead className="text-right">Meses</TableHead>
                      <TableHead>Eficiência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearlyData.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum dado no período.</TableCell></TableRow>
                    ) : (
                      yearlyData.map((y) => {
                        const pct = y.billed > 0 ? (y.received / y.billed) * 100 : 0;
                        return (
                          <TableRow key={y.year} className="font-medium">
                            <TableCell className="font-bold text-base">{y.year}</TableCell>
                            <TableCell className="text-right">{fmt(y.billed)}</TableCell>
                            <TableCell className="text-right text-green-600 font-bold">{fmt(y.received)}</TableCell>
                            <TableCell className={`text-right font-bold ${y.gap > 0 ? "text-red-600" : "text-green-600"}`}>{y.gap > 0 ? fmt(y.gap) : `-${fmt(Math.abs(y.gap))}`}</TableCell>
                            <TableCell className="text-right font-bold">{pct.toFixed(1)}%</TableCell>
                            <TableCell className="text-right text-muted-foreground">{y.months}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[80px]">
                                <div className="flex-1 bg-muted rounded-full h-2">
                                  <div className={`h-2 rounded-full ${pct >= 90 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                {yearlyData.length > 0 && (
                  <div className="p-3 border-t text-sm text-muted-foreground">
                    {yearlyData.length} ano(s) · {data.data?.months.length ?? 0} meses no total
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 5 — PREVISÃO DE RECEBIMENTO
// ════════════════════════════════════════════════════════════════════════════
function ForecastTab() {
  const [historicalMonths, setHistoricalMonths] = useState("12");
  const [applied, setApplied] = useState<{ historicalMonths: number } | null>(null);

  const data = useQuery({
    queryKey: ["financial-reports", "forecast", applied],
    enabled: !!applied,
    queryFn: () => getReceivableForecast(applied!),
  });

  const handleSearch = () => setApplied({ historicalMonths: Number(historicalMonths) });

  const handleExport = () => {
    if (!data.data) return;
    const headers = ["Mês", "Previsto Bruto", "Previsto Ajustado", "Ajuste (Gap)", "Qtd Títulos"];
    const rows = data.data.months.map((m) => [m.month, m.rawAmount, m.adjustedAmount, m.rawAmount - m.adjustedAmount, m.count]);
    downloadXlsx("previsao_recebimento.xlsx", headers, rows, "Previsão", { currencyColumns: [1, 2, 3] });
    downloadCsv("previsao_recebimento.csv", headers, rows);
  };

  const totals = data.data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Previsão de Recebimento</h3>
          <p className="text-sm text-muted-foreground">Projeção dos recebimentos futuros com ajuste pela taxa histórica de inadimplência.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!applied}><Download className="w-4 h-4 mr-2" />Exportar</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">Base histórica para inadimplência</label>
              <Select value={historicalMonths} onValueChange={setHistoricalMonths}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Últimos 3 meses</SelectItem>
                  <SelectItem value="6">Últimos 6 meses</SelectItem>
                  <SelectItem value="12">Últimos 12 meses</SelectItem>
                  <SelectItem value="24">Últimos 24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch}><Search className="w-4 h-4 mr-2" />Gerar Previsão</Button>
          </div>
        </CardContent>
      </Card>

      {!applied ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Clique em Gerar Previsão para calcular.</CardContent></Card>
      ) : data.isLoading ? (
        <Card><CardContent className="py-12 text-center">Calculando previsão...</CardContent></Card>
      ) : data.isError ? (
        <Card><CardContent className="py-12 text-center text-destructive">Erro ao carregar.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TAXA INADIMPLÊNCIA HISTÓRICA</div><div className="text-2xl font-bold text-red-600">{fmtPct(data.data?.delinquencyRate ?? 0)}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">PREVISTO BRUTO</div><div className="text-2xl font-bold text-blue-600">{fmt(totals?.rawAmount ?? 0)}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">PREVISTO AJUSTADO</div><div className="text-2xl font-bold text-green-600">{fmt(totals?.adjustedAmount ?? 0)}</div></CardContent></Card>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Vencimentos (bruto)</TableHead>
                  <TableHead className="text-right">Previsão Ajustada</TableHead>
                  <TableHead className="text-right">Ajuste Inadimp.</TableHead>
                  <TableHead className="text-right">Qtd Títulos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.data?.months.length ?? 0) === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sem títulos futuros em aberto.</TableCell></TableRow>
                ) : (
                  data.data?.months.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.month}</TableCell>
                      <TableCell className="text-right">{fmt(m.rawAmount)}</TableCell>
                      <TableCell className="text-right text-green-700 font-medium">{fmt(m.adjustedAmount)}</TableCell>
                      <TableCell className="text-right text-red-600">-{fmt(m.rawAmount - m.adjustedAmount)}</TableCell>
                      <TableCell className="text-right">{fmtN(m.count)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="p-3 border-t text-sm text-muted-foreground">
              Fórmula: Previsto Ajustado = Vencimentos × (1 − {fmtPct(data.data?.delinquencyRate ?? 0)})
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 6 — CLIENTES EM RISCO
// ════════════════════════════════════════════════════════════════════════════
function AtRiskTab() {
  const [top, setTop] = useState("50");
  const [applied, setApplied] = useState<{ top: number } | null>(null);

  const data = useQuery({
    queryKey: ["financial-reports", "at-risk", applied],
    enabled: !!applied,
    queryFn: () => getAtRiskCustomers(applied!),
  });

  const handleSearch = () => setApplied({ top: Number(top) });

  const handleExport = () => {
    if (!data.data) return;
    const headers = ["Cliente", "Razão Social", "CPF/CNPJ", "Títulos Vencidos", "Maior Atraso (d)", "Dias s/ Pagar", "% Inadimpl.", "Total Aberto", "Score", "Risco"];
    const rows = data.data.items.map((i) => [dn(i), i.customerName, i.document || "", i.overdueCount, i.maxDelayDays, i.daysSinceLastPayment ?? "", `${(i.defaultRate * 100).toFixed(1)}%`, i.totalOpen, i.score, riskLabels[i.riskLevel]]);
    downloadXlsx("clientes_em_risco.xlsx", headers, rows, "Risco", { currencyColumns: [6] });
    downloadCsv("clientes_em_risco.csv", headers, rows);
  };

  const highCount = data.data?.items.filter((i) => i.riskLevel === "HIGH").length ?? 0;
  const medCount = data.data?.items.filter((i) => i.riskLevel === "MEDIUM").length ?? 0;
  const totalOpen = data.data?.items.reduce((s, i) => s + i.totalOpen, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Clientes em Risco</h3>
          <p className="text-sm text-muted-foreground">Score composto: qtd vencidos (30%) + atraso máx (30%) + dias sem pagar (20%) + taxa inadimp (20%).</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!applied}><Download className="w-4 h-4 mr-2" />Exportar</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">Exibir top</label>
              <Select value={top} onValueChange={setTop}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch}><RefreshCw className="w-4 h-4 mr-2" />Calcular</Button>
          </div>
        </CardContent>
      </Card>

      {!applied ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Clique em Calcular para gerar o score.</CardContent></Card>
      ) : data.isLoading ? (
        <Card><CardContent className="py-12 text-center">Calculando scores...</CardContent></Card>
      ) : data.isError ? (
        <Card><CardContent className="py-12 text-center text-destructive">Erro ao calcular.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">RISCO ALTO</div><div className="text-2xl font-bold text-red-600">{highCount}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">RISCO MÉDIO</div><div className="text-2xl font-bold text-yellow-600">{medCount}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">VALOR EM RISCO</div><div className="text-2xl font-bold text-red-600">{fmt(totalOpen)}</div></CardContent></Card>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Vencidos</TableHead>
                  <TableHead className="text-right">Maior Atraso</TableHead>
                  <TableHead className="text-right">Dias s/ Pagar</TableHead>
                  <TableHead className="text-right">% Inadimp.</TableHead>
                  <TableHead className="text-right">Total Aberto</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.data?.items.length ?? 0) === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum cliente em risco.</TableCell></TableRow>
                ) : (
                  data.data?.items.map((item, idx) => (
                    <TableRow key={item.customerId}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div>{dn(item)}</div>
                        {item.customerName !== dn(item) && <div className="text-xs text-muted-foreground">{item.customerName}</div>}
                      </TableCell>
                      <TableCell className="text-right">{item.overdueCount}</TableCell>
                      <TableCell className="text-right">{item.maxDelayDays}d</TableCell>
                      <TableCell className="text-right">{item.daysSinceLastPayment !== null ? `${item.daysSinceLastPayment}d` : "—"}</TableCell>
                      <TableCell className="text-right">{fmtPct(item.defaultRate)}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">{fmt(item.totalOpen)}</TableCell>
                      <TableCell className="text-right font-bold">{(item.score * 100).toFixed(0)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColors[item.riskLevel]}`}>
                          {riskLabels[item.riskLevel]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 7 — CHURN DE CLIENTES
// ════════════════════════════════════════════════════════════════════════════
function ChurnTab() {
  const [dateFrom, setDateFrom] = useState(monthStart(11));
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState<{ dateFrom: string; dateTo: string } | null>(null);

  const data = useQuery({
    queryKey: ["financial-reports", "churn", applied],
    enabled: !!applied,
    queryFn: () => getChurnAnalysis(applied!),
  });

  const handleSearch = () => setApplied({ dateFrom, dateTo });

  const handleExport = () => {
    if (!data.data) return;
    const headers = ["Mês", "Cancelados", "Valor Cancelado", "Clientes Ativos Base", "Churn Rate %"];
    const rows = data.data.months.map((m) => [m.month, m.churned, m.churnedValue, m.totalActiveAtMonth, `${(m.churnRate * 100).toFixed(2)}%`]);
    downloadXlsx("churn.xlsx", headers, rows, "Churn", { currencyColumns: [2] });
    downloadCsv("churn.csv", headers, rows);
  };

  const totals = data.data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Churn de Clientes</h3>
          <p className="text-sm text-muted-foreground">Clientes cancelados por mês com valor de receita impactado. Baseado em registros de desativação.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!applied}><Download className="w-4 h-4 mr-2" />Exportar</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">De</label>
              <DateInputPicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Até</label>
              <DateInputPicker value={dateTo} onChange={setDateTo} />
            </div>
            <Button onClick={handleSearch}><Search className="w-4 h-4 mr-2" />Buscar</Button>
          </div>
        </CardContent>
      </Card>

      {!applied ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione o período e clique em Buscar.</CardContent></Card>
      ) : data.isLoading ? (
        <Card><CardContent className="py-12 text-center">Carregando...</CardContent></Card>
      ) : data.isError ? (
        <Card><CardContent className="py-12 text-center text-destructive">Erro ao carregar.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TOTAL CANCELADOS</div><div className="text-2xl font-bold text-red-600">{fmtN(totals?.totalChurned ?? 0)}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">CHURN RATE MÉDIO</div><div className="text-2xl font-bold">{fmtPct(totals?.avgChurnRate ?? 0)}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">RECEITA IMPACTADA</div><div className="text-2xl font-bold text-red-600">{fmt(totals?.totalChurnedValue ?? 0)}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">ATIVOS HOJE</div><div className="text-2xl font-bold text-green-600">{fmtN(totals?.activeCustomers ?? 0)}</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tabela mensal */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Evolução Mensal</CardTitle></CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Cancelados</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Churn %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.data?.months.length ?? 0) === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhum cancelamento no período.</TableCell></TableRow>
                  ) : (
                    data.data?.months.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell>{m.month}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium">{m.churned}</TableCell>
                        <TableCell className="text-right">{fmt(m.churnedValue)}</TableCell>
                        <TableCell className="text-right">{fmtPct(m.churnRate)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Top motivos */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Motivos de Cancelamento</CardTitle></CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const reasonMap = new Map<string, number>();
                    for (const m of data.data?.months ?? []) {
                      for (const r of m.reasons) {
                        const key = r.reason ?? "Não informado";
                        reasonMap.set(key, (reasonMap.get(key) ?? 0) + r.count);
                      }
                    }
                    const reasons = Array.from(reasonMap.entries()).sort(([, a], [, b]) => b - a);
                    if (reasons.length === 0) return (
                      <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">Sem motivos registrados.</TableCell></TableRow>
                    );
                    return reasons.map(([reason, count]) => (
                      <TableRow key={reason}>
                        <TableCell>{reason}</TableCell>
                        <TableCell className="text-right font-medium">{count}</TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 8 — COHORT DE RETENÇÃO
// ════════════════════════════════════════════════════════════════════════════
function CohortTab() {
  const [dateFrom, setDateFrom] = useState(monthStart(11));
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState<{ dateFrom: string; dateTo: string } | null>(null);

  const data = useQuery({
    queryKey: ["financial-reports", "cohort", applied],
    enabled: !!applied,
    queryFn: () => getCohortAnalysis(applied!),
  });

  const handleSearch = () => setApplied({ dateFrom, dateTo });

  // Determina o máximo de períodos para cabeçalho
  const maxPeriods = useMemo(() => {
    if (!data.data?.cohorts) return 0;
    return Math.max(0, ...data.data.cohorts.map((c) => c.periods.length));
  }, [data.data]);

  const cellColor = (rate: number) =>
    rate >= 0.7 ? "bg-green-100 text-green-800" :
    rate >= 0.4 ? "bg-yellow-100 text-yellow-800" :
    rate > 0    ? "bg-red-100 text-red-700" :
                  "bg-muted text-muted-foreground";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Cohort de Retenção</h3>
        <p className="text-sm text-muted-foreground">
          Clientes agrupados pelo mês de cadastro. Cada célula mostra a % que pagou algum título naquele mês.
          <span className="ml-2 text-green-700 font-medium">■ ≥70%</span>
          <span className="ml-2 text-yellow-700 font-medium">■ 40-70%</span>
          <span className="ml-2 text-red-700 font-medium">■ &lt;40%</span>
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">Clientes cadastrados de</label>
              <DateInputPicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">até</label>
              <DateInputPicker value={dateTo} onChange={setDateTo} />
            </div>
            <Button onClick={handleSearch}><Search className="w-4 h-4 mr-2" />Gerar Cohort</Button>
          </div>
        </CardContent>
      </Card>

      {!applied ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione o período de cadastro e clique em Gerar Cohort.</CardContent></Card>
      ) : data.isLoading ? (
        <Card><CardContent className="py-12 text-center">Processando cohort...</CardContent></Card>
      ) : data.isError ? (
        <Card><CardContent className="py-12 text-center text-destructive">Erro ao calcular cohort.</CardContent></Card>
      ) : (data.data?.cohorts.length ?? 0) === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum cliente cadastrado no período.</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[110px]">Cohort</TableHead>
                  <TableHead className="text-right min-w-[60px]">Tamanho</TableHead>
                  {Array.from({ length: maxPeriods }, (_, i) => (
                    <TableHead key={i} className="text-center min-w-[56px] text-xs">M+{i}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data?.cohorts.map((cohort) => (
                  <TableRow key={cohort.cohortMonth}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">{cohort.cohortMonth}</TableCell>
                    <TableCell className="text-right">{cohort.size}</TableCell>
                    {Array.from({ length: maxPeriods }, (_, i) => {
                      const period = cohort.periods.find((p) => p.periodOffset === i);
                      const rate = period?.retentionRate ?? 0;
                      const hasData = !!period;
                      return (
                        <TableCell key={i} className="text-center p-1">
                          {hasData ? (
                            <span className={`text-xs font-medium px-1 py-0.5 rounded ${cellColor(rate)}`}>
                              {(rate * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 border-t text-sm text-muted-foreground">
            {fmtN(data.data?.cohorts.length ?? 0)} cohorts | {fmtN(data.data?.cohorts.reduce((s, c) => s + c.size, 0) ?? 0)} clientes totais
          </div>
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 9 — MUDANÇA DE COMPORTAMENTO DE PAGAMENTO
//   Clientes que historicamente pagavam em dia mas começaram a atrasar
//   nos últimos N meses.
// ════════════════════════════════════════════════════════════════════════════

// ── Helper: botão de info reutilizável ──────────────────────────────────────
function InfoButton({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label={title}>
          <Info className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm space-y-2" side="right">
        <p className="font-semibold">{title}</p>
        {children}
      </PopoverContent>
    </Popover>
  );
}

const severityConfig = {
  SEVERE:   { label: "Severo",   badge: "bg-red-100 text-red-800",     icon: "🔴" },
  MODERATE: { label: "Moderado", badge: "bg-orange-100 text-orange-800", icon: "🟠" },
  MILD:     { label: "Leve",     badge: "bg-yellow-100 text-yellow-800", icon: "🟡" },
};

function BehaviorChangeTab() {
  const [recentMonths, setRecentMonths] = useState("3");
  const [innerTab, setInnerTab] = useState("starting");

  // ── Estado compartilhado para os 10 novos sub-relatórios ─────────────────
  const [appliedFull, setAppliedFull] = useState<{ recentMonths: number } | null>(null);
  // ── Estado para o sub-relatório 1 (endpoint próprio) ─────────────────────
  const [appliedChange, setAppliedChange] = useState<{ recentMonths: number } | null>(null);

  const fullData = useQuery({
    queryKey: ["financial-reports", "behavior-full", appliedFull],
    enabled: !!appliedFull,
    queryFn: () => getBehaviorFullAnalysis(appliedFull!),
  });

  const changeData = useQuery({
    queryKey: ["financial-reports", "behavior-change", appliedChange],
    enabled: !!appliedChange,
    queryFn: () => getPaymentBehaviorChange(appliedChange!),
  });

  const handleSearch = () => {
    const params = { recentMonths: Number(recentMonths) };
    setAppliedFull(params);
    setAppliedChange(params);
  };

  const months = Number(recentMonths);

  return (
    <div className="space-y-4">
      {/* Cabeçalho e filtro global */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Análise de Comportamento de Pagamento</h3>
          <p className="text-sm text-muted-foreground">
            Detecta padrões e mudanças no comportamento de pagamento dos clientes.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">Período recente</label>
              <Select value={recentMonths} onValueChange={setRecentMonths}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Último 1 mês</SelectItem>
                  <SelectItem value="2">Últimos 2 meses</SelectItem>
                  <SelectItem value="3">Últimos 3 meses</SelectItem>
                  <SelectItem value="6">Últimos 6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch}>
              <RefreshCw className="w-4 h-4 mr-2" />Analisar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sub-abas de comportamento */}
      <Tabs value={innerTab} onValueChange={setInnerTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="starting"    className="text-xs">🔴 Começando a Atrasar</TabsTrigger>
          <TabsTrigger value="deteriorate" className="text-xs">📈 Piorando M/M</TabsTrigger>
          <TabsTrigger value="onlimit"     className="text-xs">⏱ No Limite</TabsTrigger>
          <TabsTrigger value="stopped"     className="text-xs">↩ Deixou de Antecipar</TabsTrigger>
          <TabsTrigger value="opengrowing" className="text-xs">📊 Volume Crescendo</TabsTrigger>
          <TabsTrigger value="smalldelay"  className="text-xs">🔁 Parcelas Pequenas</TabsTrigger>
          <TabsTrigger value="alternating" className="text-xs">〰 Instável</TabsTrigger>
          <TabsTrigger value="reduced"     className="text-xs">📉 Redução + Atraso</TabsTrigger>
          <TabsTrigger value="concentrated" className="text-xs">⚠ Risco Concentrado</TabsTrigger>
          <TabsTrigger value="critical"    className="text-xs">🚨 Risco Crítico</TabsTrigger>
          <TabsTrigger value="recovered"   className="text-xs">✅ Recuperados</TabsTrigger>
        </TabsList>

        {/* ── 1. Começando a Atrasar ──────────────────────────────────────── */}
        <TabsContent value="starting" className="mt-4">
          <BehaviorStartingTab data={changeData} months={months} appliedChange={appliedChange} />
        </TabsContent>

        {/* ── 2–11: usam fullData ─────────────────────────────────────────── */}
        <TabsContent value="deteriorate" className="mt-4">
          <BehaviorFullSubTab applied={!!appliedFull} isLoading={fullData.isLoading} isError={fullData.isError}>
            <DeterioratingSubTab items={(fullData.data?.deteriorating ?? []) as DeterioratingItem[]} months={months} />
          </BehaviorFullSubTab>
        </TabsContent>
        <TabsContent value="onlimit" className="mt-4">
          <BehaviorFullSubTab applied={!!appliedFull} isLoading={fullData.isLoading} isError={fullData.isError}>
            <OnLimitSubTab items={(fullData.data?.onLimit ?? []) as OnLimitItem[]} />
          </BehaviorFullSubTab>
        </TabsContent>
        <TabsContent value="stopped" className="mt-4">
          <BehaviorFullSubTab applied={!!appliedFull} isLoading={fullData.isLoading} isError={fullData.isError}>
            <StoppedAnticipatorsSubTab items={(fullData.data?.stoppedAnticipating ?? []) as StoppedAnticipatorsItem[]} months={months} />
          </BehaviorFullSubTab>
        </TabsContent>
        <TabsContent value="opengrowing" className="mt-4">
          <BehaviorFullSubTab applied={!!appliedFull} isLoading={fullData.isLoading} isError={fullData.isError}>
            <IncreasingOpenSubTab items={(fullData.data?.increasingOpen ?? []) as IncreasingOpenItem[]} />
          </BehaviorFullSubTab>
        </TabsContent>
        <TabsContent value="smalldelay" className="mt-4">
          <BehaviorFullSubTab applied={!!appliedFull} isLoading={fullData.isLoading} isError={fullData.isError}>
            <RecurringSmallSubTab items={(fullData.data?.recurringSmall ?? []) as RecurringSmallItem[]} />
          </BehaviorFullSubTab>
        </TabsContent>
        <TabsContent value="alternating" className="mt-4">
          <BehaviorFullSubTab applied={!!appliedFull} isLoading={fullData.isLoading} isError={fullData.isError}>
            <AlternatingSubTab items={(fullData.data?.alternating ?? []) as AlternatingItem[]} />
          </BehaviorFullSubTab>
        </TabsContent>
        <TabsContent value="reduced" className="mt-4">
          <BehaviorFullSubTab applied={!!appliedFull} isLoading={fullData.isLoading} isError={fullData.isError}>
            <ReducedPurchasesSubTab items={(fullData.data?.reducedPurchases ?? []) as ReducedPurchasesItem[]} />
          </BehaviorFullSubTab>
        </TabsContent>
        <TabsContent value="concentrated" className="mt-4">
          <BehaviorFullSubTab applied={!!appliedFull} isLoading={fullData.isLoading} isError={fullData.isError}>
            <ConcentratedSubTab items={(fullData.data?.concentrated ?? []) as ConcentratedItem[]} totalOpenAR={fullData.data?.totalOpenAR ?? 0} />
          </BehaviorFullSubTab>
        </TabsContent>
        <TabsContent value="critical" className="mt-4">
          <BehaviorFullSubTab applied={!!appliedFull} isLoading={fullData.isLoading} isError={fullData.isError}>
            <CriticalRiskSubTab items={(fullData.data?.criticalRisk ?? []) as CriticalRiskItem[]} />
          </BehaviorFullSubTab>
        </TabsContent>
        <TabsContent value="recovered" className="mt-4">
          <BehaviorFullSubTab applied={!!appliedFull} isLoading={fullData.isLoading} isError={fullData.isError}>
            <RecoveredSubTab items={(fullData.data?.recovered ?? []) as RecoveredItem[]} months={months} />
          </BehaviorFullSubTab>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Wrapper de estado para sub-tabs que usam fullData ─────────────────────
function BehaviorFullSubTab({
  applied, isLoading, isError, children,
}: {
  applied: boolean; isLoading: boolean; isError: boolean; children: React.ReactNode;
}) {
  if (!applied) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">Clique em Analisar para carregar.</CardContent></Card>
  );
  if (isLoading) return (
    <Card><CardContent className="py-12 text-center">Analisando comportamento...</CardContent></Card>
  );
  if (isError) return (
    <Card><CardContent className="py-12 text-center text-destructive">Erro ao analisar.</CardContent></Card>
  );
  return <>{children}</>;
}

// ── Helper: tabela vazia ───────────────────────────────────────────────────
function BehaviorEmptyState({ icon, text, sub }: { icon?: React.ReactNode; text: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        {icon && <div className="mb-3 opacity-30 flex justify-center">{icon}</div>}
        <p className="font-medium">{text}</p>
        {sub && <p className="text-xs mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Sub-tab 1: Começando a Atrasar ────────────────────────────────────────
function BehaviorStartingTab({
  data, months, appliedChange,
}: {
  data: UseQueryResult<PaymentBehaviorResponse>;
  months: number;
  appliedChange: { recentMonths: number } | null;
}) {
  const totals = data.data?.totals;
  const handleExport = () => {
    if (!data.data) return;
    const headers = ["Cliente","Razão Social","CPF/CNPJ","Títulos Históricos","% Pontual Hist.","Títulos Recentes","Qtd Atrasados","% Atrasado","Atraso Médio (d)","Em Aberto","Severidade"];
    const rows = data.data.items.map((i) => [dn(i),i.customerName,i.document??'',i.historicalCount,`${(i.historicalOnTimeRate*100).toFixed(1)}%`,i.recentTotal,i.recentLateCount,`${(i.recentLateRate*100).toFixed(1)}%`,i.recentAvgDelayDays,i.totalOpen,severityConfig[i.severity].label]);
    downloadXlsx("comecando_atrasar.xlsx", headers, rows, "Começando a Atrasar", { currencyColumns:[9] });
    downloadCsv("comecando_atrasar.csv", headers, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">Clientes que Começaram a Atrasar</h4>
          <InfoButton title="Como funciona este relatório?">
            <p className="text-muted-foreground">Detecta clientes que <strong>historicamente pagavam em dia</strong> (≥ 70% de pontualidade) mas passaram a atrasar no período recente selecionado.</p>
            <div className="space-y-1 text-muted-foreground text-xs border-t pt-2">
              <p>✅ Mínimo 3 títulos pagos no histórico</p>
              <p>✅ ≥ 70% de pontualidade histórica</p>
              <p>✅ ≥ 30% de atraso no período recente</p>
              <p className="pt-1">🔴 Severo ≥ 70% · 🟠 Moderado 50–69% · 🟡 Leve 30–49%</p>
            </div>
          </InfoButton>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!appliedChange} size="sm"><Download className="w-3.5 h-3.5 mr-1.5" />Exportar</Button>
      </div>

      {!appliedChange ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Clique em Analisar para carregar.</CardContent></Card>
      ) : data.isLoading ? (
        <Card><CardContent className="py-10 text-center">Analisando...</CardContent></Card>
      ) : data.isError ? (
        <Card><CardContent className="py-10 text-center text-destructive">Erro ao analisar.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">TOTAL</div><div className="text-2xl font-bold">{totals?.total??0}</div></CardContent></Card>
            <Card className="border-red-200"><CardContent className="p-3 text-center"><div className="text-xs text-red-600 font-medium">🔴 SEVERO</div><div className="text-2xl font-bold text-red-600">{totals?.severe??0}</div></CardContent></Card>
            <Card className="border-orange-200"><CardContent className="p-3 text-center"><div className="text-xs text-orange-600 font-medium">🟠 MODERADO</div><div className="text-2xl font-bold text-orange-600">{totals?.moderate??0}</div></CardContent></Card>
            <Card className="border-yellow-200"><CardContent className="p-3 text-center"><div className="text-xs text-yellow-600 font-medium">🟡 LEVE</div><div className="text-2xl font-bold text-yellow-600">{totals?.mild??0}</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">EM ABERTO</div><div className="text-lg font-bold text-red-600">{fmt(totals?.totalOpenAtRisk??0)}</div></CardContent></Card>
          </div>
          {(data.data?.items.length??0)===0 ? (
            <BehaviorEmptyState icon={<Activity className="w-10 h-10"/>} text="Nenhum cliente com mudança de comportamento detectada." sub={`Todos mantêm o padrão histórico nos últimos ${months} meses.`} />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Severidade</TableHead>
                    <TableHead className="text-center">Histórico</TableHead>
                    <TableHead className="text-center">% Pontual</TableHead>
                    <TableHead className="text-center border-l bg-red-50/40">Recente ({months}m)</TableHead>
                    <TableHead className="text-center bg-red-50/40">% Atrasado</TableHead>
                    <TableHead className="text-center bg-red-50/40">Atraso Médio</TableHead>
                    <TableHead className="text-right bg-red-50/40">Em Aberto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data?.items.map((item) => {
                    const cfg = severityConfig[item.severity];
                    const deltaPct = item.recentLateRate-(1-item.historicalOnTimeRate);
                    return (
                      <TableRow key={item.customerId}>
                        <TableCell>
                          <div className="font-medium">{dn(item)}</div>
                          {item.knownName?.trim()&&<div className="text-xs text-muted-foreground">{item.customerName}</div>}
                          {item.document&&<div className="text-xs text-muted-foreground">{item.document}</div>}
                        </TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.badge}`}>{cfg.icon} {cfg.label}</span></TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm font-medium">{item.historicalCount} títulos</div>
                          {item.historicalAvgDelayDays>0&&<div className="text-xs text-muted-foreground">atraso médio {item.historicalAvgDelayDays}d</div>}
                        </TableCell>
                        <TableCell className="text-center"><span className="text-green-700 font-semibold">{(item.historicalOnTimeRate*100).toFixed(0)}%</span></TableCell>
                        <TableCell className="text-center border-l bg-red-50/20">
                          <div className="text-sm font-medium">{item.recentLateCount}/{item.recentTotal}</div>
                          <div className="text-xs text-muted-foreground">atrasados</div>
                        </TableCell>
                        <TableCell className="text-center bg-red-50/20">
                          <div className="font-bold text-red-600">{(item.recentLateRate*100).toFixed(0)}%</div>
                          {deltaPct>0.05&&<div className="text-xs text-red-500">▲ +{(deltaPct*100).toFixed(0)}pp</div>}
                        </TableCell>
                        <TableCell className="text-center bg-red-50/20">
                          {item.recentAvgDelayDays>0?<span className="text-orange-600 font-medium">{item.recentAvgDelayDays}d</span>:<span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right bg-red-50/20">
                          {item.totalOpen>0?<span className="font-semibold text-red-600">{fmt(item.totalOpen)}</span>:<span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="p-3 border-t text-xs text-muted-foreground">
                {data.data?.items.length} cliente(s) · Base mínima: 3 títulos · Pontualidade histórica ≥ 70% · Atraso recente ≥ 30%
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-tab 2: Piorando mês a mês ─────────────────────────────────────────
function DeterioratingSubTab({ items, months }: { items: DeterioratingItem[]; months: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">Clientes Piorando Mês a Mês</h4>
        <InfoButton title="Como funciona este relatório?">
          <p className="text-muted-foreground">Detecta clientes com <strong>tendência de deterioração crescente</strong> no tempo médio de pagamento. Não olha só se estão atrasados, mas se o atraso médio está aumentando mês após mês.</p>
          <div className="space-y-1 text-muted-foreground text-xs border-t pt-2">
            <p>📐 Divide o histórico de pagamentos em duas metades</p>
            <p>📈 Compara a média de dias entre a 1ª e 2ª metade</p>
            <p>✅ Exige ≥ 4 meses de dados e delta ≥ 5 dias</p>
            <p>💡 <strong>Uso:</strong> ideal para cobranças preventivas antes da inadimplência</p>
          </div>
        </InfoButton>
      </div>
      {items.length===0 ? (
        <BehaviorEmptyState text="Nenhum cliente com tendência de deterioração detectada." sub="Os padrões de pagamento estão estáveis ou melhorando." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">1ª Metade (média dias)</TableHead>
                <TableHead className="text-right">2ª Metade (média dias)</TableHead>
                <TableHead className="text-right">Piora</TableHead>
                <TableHead>Evolução</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const maxAbsDay = Math.max(...item.monthlyAvgDelay.map(m => Math.abs(m.avgDays)), 1);
                return (
                  <TableRow key={item.customerId}>
                    <TableCell>
                      <div className="font-medium">{dn(item)}</div>
                      {item.knownName?.trim()&&<div className="text-xs text-muted-foreground">{item.customerName}</div>}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{item.firstHalfAvg}d</TableCell>
                    <TableCell className="text-right text-red-600 font-bold">{item.secondHalfAvg}d</TableCell>
                    <TableCell className="text-right">
                      <span className="text-red-600 font-bold">▲ +{item.trendDelta}d</span>
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <div className="flex gap-0.5 items-end h-6">
                        {item.monthlyAvgDelay.slice(-8).map((m, i) => {
                          const h = Math.max(2, Math.min(24, Math.round(Math.abs(m.avgDays)/maxAbsDay*24)));
                          return (
                            <div key={i} title={`${m.month}: ${m.avgDays}d`}
                              className={`w-3 rounded-t ${m.avgDays>0?"bg-red-400":"bg-green-400"}`}
                              style={{height:`${h}px`}}
                            />
                          );
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.monthlyAvgDelay.length} meses</div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="p-3 border-t text-xs text-muted-foreground">{items.length} cliente(s) com tendência de piora no prazo de pagamento.</div>
        </Card>
      )}
    </div>
  );
}

// ── Sub-tab 3: Paga no limite ──────────────────────────────────────────────
function OnLimitSubTab({ items }: { items: OnLimitItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">Clientes que Pagam no Limite</h4>
        <InfoButton title="Como funciona este relatório?">
          <p className="text-muted-foreground">Identifica clientes que <strong>raramente ficam inadimplentes</strong>, mas pagam sempre muito próximo ao vencimento (entre −3 e +7 dias). Ainda não são problema, mas qualquer aperto financeiro pode mudá-los.</p>
          <div className="space-y-1 text-muted-foreground text-xs border-t pt-2">
            <p>📏 Classifica como "no limite" pagamentos entre −3 e +7 dias do vencimento</p>
            <p>✅ Exige ≥ 65% dos pagamentos nessa faixa</p>
            <p>✅ Média geral de −3 a +10 dias</p>
            <p>✅ Mínimo 5 títulos pagos</p>
            <p>💡 <strong>Uso:</strong> enviar lembretes antecipados e oferecer débito automático</p>
          </div>
        </InfoButton>
      </div>
      {items.length===0 ? (
        <BehaviorEmptyState text="Nenhum cliente com padrão 'no limite' identificado." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Títulos</TableHead>
                <TableHead className="text-right">Antecipados</TableHead>
                <TableHead className="text-right">No prazo</TableHead>
                <TableHead className="text-right">Após venc.</TableHead>
                <TableHead className="text-right">% No Limite</TableHead>
                <TableHead className="text-right">Média (dias)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.customerId}>
                  <TableCell>
                    <div className="font-medium">{dn(item)}</div>
                    {item.knownName?.trim()&&<div className="text-xs text-muted-foreground">{item.customerName}</div>}
                  </TableCell>
                  <TableCell className="text-right">{item.totalPaid}</TableCell>
                  <TableCell className="text-right text-blue-600">{item.earlyCount}</TableCell>
                  <TableCell className="text-right text-green-600">{item.onTimeCount}</TableCell>
                  <TableCell className="text-right text-orange-600">{item.lateCount}</TableCell>
                  <TableCell className="text-right font-bold">{(item.pctNearLimit*100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right">
                    <span className={item.avgDaysToPayment>3?"text-orange-600":item.avgDaysToPayment<-1?"text-blue-600":"text-green-600"}>
                      {item.avgDaysToPayment>0?`+${item.avgDaysToPayment}d`:item.avgDaysToPayment===0?"0d":`${item.avgDaysToPayment}d`}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-3 border-t text-xs text-muted-foreground">{items.length} cliente(s) pagando consistentemente próximo ao vencimento.</div>
        </Card>
      )}
    </div>
  );
}

// ── Sub-tab 4: Deixou de antecipar ────────────────────────────────────────
function StoppedAnticipatorsSubTab({ items, months }: { items: StoppedAnticipatorsItem[]; months: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">Clientes que Deixaram de Antecipar</h4>
        <InfoButton title="Como funciona este relatório?">
          <p className="text-muted-foreground">Identifica clientes que <strong>costumavam pagar antes do vencimento</strong> mas recentemente passaram a pagar depois. Esse é um sinal precoce de aperto financeiro.</p>
          <div className="space-y-1 text-muted-foreground text-xs border-t pt-2">
            <p>📅 Histórico: média de pagamento menor que −2 dias (antes do venc.)</p>
            <p>📅 Recente: média pior em pelo menos +5 dias</p>
            <p>✅ Mínimo 3 títulos no histórico e 1 recente</p>
            <p>💡 <strong>Uso:</strong> sinal de alerta financeiro antes da inadimplência — acione contato preventivo</p>
          </div>
        </InfoButton>
      </div>
      {items.length===0 ? (
        <BehaviorEmptyState text="Nenhum cliente que deixou de antecipar pagamentos." sub="Os clientes que costumavam pagar adiantado mantêm o padrão." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Média Histórica</TableHead>
                <TableHead className="text-right">Média Recente ({months}m)</TableHead>
                <TableHead className="text-right">Variação</TableHead>
                <TableHead className="text-right">Títulos Hist.</TableHead>
                <TableHead className="text-right">Títulos Rec.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.customerId}>
                  <TableCell>
                    <div className="font-medium">{dn(item)}</div>
                    {item.knownName?.trim()&&<div className="text-xs text-muted-foreground">{item.customerName}</div>}
                  </TableCell>
                  <TableCell className="text-right text-blue-600 font-medium">{item.historicalAvg}d</TableCell>
                  <TableCell className="text-right font-bold">
                    <span className={item.recentAvg>0?"text-red-600":"text-orange-600"}>{item.recentAvg>0?`+${item.recentAvg}d`:`${item.recentAvg}d`}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-red-600 font-bold">▲ +{item.delta}d</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.historicalCount}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.recentCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-3 border-t text-xs text-muted-foreground">{items.length} cliente(s) que costumavam antecipar e agora estão atrasando.</div>
        </Card>
      )}
    </div>
  );
}

// ── Sub-tab 5: Volume em aberto crescendo ─────────────────────────────────
function IncreasingOpenSubTab({ items }: { items: IncreasingOpenItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">Clientes com Aumento de Volume em Aberto</h4>
        <InfoButton title="Como funciona este relatório?">
          <p className="text-muted-foreground">Detecta clientes cujo <strong>saldo de títulos em aberto está crescendo</strong> mês a mês, mesmo que o atraso individual ainda pareça controlado.</p>
          <div className="space-y-1 text-muted-foreground text-xs border-t pt-2">
            <p>📊 Agrupa títulos OPEN/OVERDUE por mês de vencimento</p>
            <p>📈 Compara total da 1ª metade vs 2ª metade do período</p>
            <p>✅ Exige crescimento ≥ 40% e mínimo 3 meses de dados</p>
            <p>💡 <strong>Uso:</strong> identifica risco de exposição antes da inadimplência crítica</p>
          </div>
        </InfoButton>
      </div>
      {items.length===0 ? (
        <BehaviorEmptyState text="Nenhum cliente com crescimento relevante no volume em aberto." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total em Aberto</TableHead>
                <TableHead className="text-right">Vencidos</TableHead>
                <TableHead className="text-right">Média Inicial</TableHead>
                <TableHead className="text-right">Média Recente</TableHead>
                <TableHead className="text-right">Crescimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.customerId}>
                  <TableCell>
                    <div className="font-medium">{dn(item)}</div>
                    {item.knownName?.trim()&&<div className="text-xs text-muted-foreground">{item.customerName}</div>}
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-600">{fmt(item.totalOpen)}</TableCell>
                  <TableCell className="text-right text-orange-600">{item.overdueCount}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt(item.firstHalfAvg)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(item.recentHalfAvg)}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-red-600 font-bold">▲ {item.growthPct}%</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-3 border-t text-xs text-muted-foreground">{items.length} cliente(s) com crescimento relevante no saldo em aberto.</div>
        </Card>
      )}
    </div>
  );
}

// ── Sub-tab 6: Atraso recorrente em parcelas pequenas ─────────────────────
function RecurringSmallSubTab({ items }: { items: RecurringSmallItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">Clientes com Atraso Recorrente em Parcelas Pequenas</h4>
        <InfoButton title="Como funciona este relatório?">
          <p className="text-muted-foreground">Identifica clientes que frequentemente atrasam <strong>títulos de valor abaixo da mediana</strong> do seu próprio histórico. Sinaliza desorganização financeira mesmo sem grande valor em risco.</p>
          <div className="space-y-1 text-muted-foreground text-xs border-t pt-2">
            <p>📏 "Pequeno" = valor abaixo da mediana dos próprios títulos do cliente</p>
            <p>✅ Exige ≥ 3 atrasos em parcelas pequenas e ≥ 25% do total</p>
            <p>✅ Mínimo 5 títulos pagos no histórico</p>
            <p>💡 <strong>Uso:</strong> detecta risco oculto — clientes que parecem OK mas têm padrão de inadimplência crônica em pequenos valores</p>
          </div>
        </InfoButton>
      </div>
      {items.length===0 ? (
        <BehaviorEmptyState text="Nenhum cliente com padrão de atraso em parcelas pequenas." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total Títulos</TableHead>
                <TableHead className="text-right">Qtd Atrasos Pequenos</TableHead>
                <TableHead className="text-right">% do Total</TableHead>
                <TableHead className="text-right">Valor Mediano</TableHead>
                <TableHead className="text-right">Atraso Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.customerId}>
                  <TableCell>
                    <div className="font-medium">{dn(item)}</div>
                    {item.knownName?.trim()&&<div className="text-xs text-muted-foreground">{item.customerName}</div>}
                  </TableCell>
                  <TableCell className="text-right">{item.totalPaid}</TableCell>
                  <TableCell className="text-right text-orange-600 font-bold">{item.smallLateCount}</TableCell>
                  <TableCell className="text-right font-semibold">{(item.smallLateRate*100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt(item.medianAmount)}</TableCell>
                  <TableCell className="text-right text-orange-600">{item.avgSmallDelay}d</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-3 border-t text-xs text-muted-foreground">{items.length} cliente(s) com atraso recorrente em parcelas pequenas.</div>
        </Card>
      )}
    </div>
  );
}

// ── Sub-tab 7: Pagamento instável ──────────────────────────────────────────
function AlternatingSubTab({ items }: { items: AlternatingItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">Clientes com Pagamento Instável</h4>
        <InfoButton title="Como funciona este relatório?">
          <p className="text-muted-foreground">Detecta clientes que <strong>alternam entre pagar em dia e atrasar muito</strong>. Esse padrão indica instabilidade financeira — o cliente paga, mas de forma irregular.</p>
          <div className="space-y-1 text-muted-foreground text-xs border-t pt-2">
            <p>〰 Analisa taxa de atraso mês a mês</p>
            <p>🔄 Conta transições abruptas: &lt;30% → &gt;60% ou vice-versa</p>
            <p>✅ Exige ≥ 2 transições e ≥ 5 meses de dados</p>
            <p>📐 Volatilidade = desvio padrão da taxa mensal de atraso</p>
            <p>💡 <strong>Uso:</strong> clientes que não viram inadimplência grave mas causam incerteza no fluxo de caixa</p>
          </div>
        </InfoButton>
      </div>
      {items.length===0 ? (
        <BehaviorEmptyState text="Nenhum cliente com padrão de pagamento instável detectado." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Alternâncias</TableHead>
                <TableHead className="text-right">Meses</TableHead>
                <TableHead className="text-right">% Atraso Médio</TableHead>
                <TableHead className="text-right">Volatilidade</TableHead>
                <TableHead>Padrão (últimos 8m)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.customerId}>
                  <TableCell>
                    <div className="font-medium">{dn(item)}</div>
                    {item.knownName?.trim()&&<div className="text-xs text-muted-foreground">{item.customerName}</div>}
                  </TableCell>
                  <TableCell className="text-right font-bold text-orange-600">{item.transitions}x</TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.monthCount}</TableCell>
                  <TableCell className="text-right">{(item.avgLateRate*100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right text-orange-600">{(item.volatility*100).toFixed(0)}%</TableCell>
                  <TableCell>
                    <div className="flex gap-0.5 items-center">
                      {item.monthlyLateRates.slice(-8).map((m, i) => (
                        <div key={i} title={`${m.month}: ${(m.lateRate*100).toFixed(0)}%`}
                          className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-bold ${m.lateRate>=0.5?"bg-red-200 text-red-700":"bg-green-200 text-green-700"}`}>
                          {m.lateRate>=0.5?"L":"✓"}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-3 border-t text-xs text-muted-foreground">{items.length} cliente(s) com padrão instável de pagamento. <span className="bg-red-100 px-1 rounded">L</span> = mês com atraso ≥50% · <span className="bg-green-100 px-1 rounded">✓</span> = mês normal.</div>
        </Card>
      )}
    </div>
  );
}

// ── Sub-tab 8: Redução de compras + atraso ────────────────────────────────
function ReducedPurchasesSubTab({ items }: { items: ReducedPurchasesItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">Clientes que Reduziram Compras e Começaram a Atrasar</h4>
        <InfoButton title="Como funciona este relatório?">
          <p className="text-muted-foreground">Cruza <strong>queda no volume faturado</strong> com <strong>piora no pagamento</strong>. É um dos melhores indicadores de risco de perda de cliente em carteiras B2B.</p>
          <div className="space-y-1 text-muted-foreground text-xs border-t pt-2">
            <p>📉 Queda: média de faturamento recente ≤ 80% da média histórica</p>
            <p>📈 Piora: taxa de atraso recente subiu ≥ 10pp ou há títulos vencidos</p>
            <p>✅ Exige ≥ 4 meses de histórico de faturamento</p>
            <p>💡 <strong>Uso:</strong> identifica clientes prestes a churnar — acione time comercial + cobrança simultaneamente</p>
          </div>
        </InfoButton>
      </div>
      {items.length===0 ? (
        <BehaviorEmptyState text="Nenhum cliente com redução simultânea de compras e piora no pagamento." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Fat. Médio Ant.</TableHead>
                <TableHead className="text-right">Fat. Médio Rec.</TableHead>
                <TableHead className="text-right">Queda Faturamento</TableHead>
                <TableHead className="text-right">Taxa Atraso Hist.</TableHead>
                <TableHead className="text-right">Taxa Atraso Rec.</TableHead>
                <TableHead className="text-right">Em Aberto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.customerId}>
                  <TableCell>
                    <div className="font-medium">{dn(item)}</div>
                    {item.knownName?.trim()&&<div className="text-xs text-muted-foreground">{item.customerName}</div>}
                  </TableCell>
                  <TableCell className="text-right">{fmt(item.firstHalfAvgBilling)}</TableCell>
                  <TableCell className="text-right text-red-600 font-medium">{fmt(item.recentHalfAvgBilling)}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">▼ {item.billingDeclinePct}%</TableCell>
                  <TableCell className="text-right text-muted-foreground">{(item.historicalLateRate*100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{(item.recentLateRate*100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right">{item.totalOpen>0?<span className="text-red-600 font-semibold">{fmt(item.totalOpen)}</span>:<span className="text-muted-foreground">—</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-3 border-t text-xs text-muted-foreground">{items.length} cliente(s) com queda de faturamento + piora no pagamento.</div>
        </Card>
      )}
    </div>
  );
}

// ── Sub-tab 9: Risco concentrado ──────────────────────────────────────────
function ConcentratedSubTab({ items, totalOpenAR }: { items: ConcentratedItem[]; totalOpenAR: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">Clientes com Risco Concentrado</h4>
        <InfoButton title="Como funciona este relatório?">
          <p className="text-muted-foreground">Identifica clientes que <strong>concentram um percentual alto da carteira total de contas a receber</strong>. Mesmo sem atraso crítico, a concentração é um risco em si.</p>
          <div className="space-y-1 text-muted-foreground text-xs border-t pt-2">
            <p>📊 Concentração = saldo do cliente ÷ total de AR da empresa</p>
            <p>✅ Exibe clientes com ≥ 2% do total em aberto</p>
            <p>💡 <strong>Uso:</strong> diversificação de carteira e priorização de cobranças por impacto financeiro</p>
          </div>
        </InfoButton>
      </div>
      {totalOpenAR > 0 && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-3 text-sm text-center">
            Total AR da empresa: <span className="font-bold">{fmt(totalOpenAR)}</span>
          </CardContent>
        </Card>
      )}
      {items.length===0 ? (
        <BehaviorEmptyState text="Nenhum cliente com concentração relevante no AR." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Em Aberto</TableHead>
                <TableHead className="text-right">% do AR Total</TableHead>
                <TableHead className="text-right">Vencidos</TableHead>
                <TableHead className="text-right">Valor Vencido</TableHead>
                <TableHead>Concentração</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.customerId}>
                  <TableCell className="text-muted-foreground font-medium">{idx+1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{dn(item)}</div>
                    {item.knownName?.trim()&&<div className="text-xs text-muted-foreground">{item.customerName}</div>}
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-600">{fmt(item.totalOpen)}</TableCell>
                  <TableCell className="text-right font-bold">{item.concentrationPct}%</TableCell>
                  <TableCell className="text-right text-orange-600">{item.overdueCount}</TableCell>
                  <TableCell className="text-right text-red-600">{fmt(item.overdueAmount)}</TableCell>
                  <TableCell>
                    <div className="w-full bg-muted rounded-full h-2 min-w-[80px]">
                      <div className={`h-2 rounded-full ${item.concentrationPct>=10?"bg-red-500":item.concentrationPct>=5?"bg-orange-500":"bg-yellow-500"}`}
                        style={{width:`${Math.min(item.concentrationPct*5,100)}%`}}/>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-3 border-t text-xs text-muted-foreground">{items.length} cliente(s) com concentração ≥ 2% do AR total.</div>
        </Card>
      )}
    </div>
  );
}

// ── Sub-tab 10: Risco crítico ──────────────────────────────────────────────
function CriticalRiskSubTab({ items }: { items: CriticalRiskItem[] }) {
  const riskCfg = {
    HIGH:   { badge: "bg-red-100 text-red-800",    label: "Alto" },
    MEDIUM: { badge: "bg-orange-100 text-orange-800", label: "Médio" },
    LOW:    { badge: "bg-yellow-100 text-yellow-800", label: "Baixo" },
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">Clientes em Risco de Inadimplência Crítica</h4>
        <InfoButton title="Como é calculado o score de risco?">
          <p className="text-muted-foreground">Score composto (0–100) que prevê risco de inadimplência severa, combinando múltiplos sinais de comportamento.</p>
          <div className="space-y-1 text-muted-foreground text-xs border-t pt-2">
            <p>📐 <strong>Componentes do score:</strong></p>
            <p>· Atraso médio recente (25%)</p>
            <p>· Qtd de títulos vencidos (25%)</p>
            <p>· Valor vencido vs AR total (20%)</p>
            <p>· Variação no comportamento (15%)</p>
            <p>· Dias sem pagamento (15%)</p>
            <p className="pt-1">🔴 Alto ≥ 65 · 🟠 Médio 40–64 · 🟡 Baixo 25–39</p>
            <p>💡 <strong>Uso:</strong> priorização de cobranças por score — foque no Alto primeiro</p>
          </div>
        </InfoButton>
      </div>
      {items.length===0 ? (
        <BehaviorEmptyState text="Nenhum cliente com risco de inadimplência crítica identificado." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Risco</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Vencidos</TableHead>
                <TableHead className="text-right">Atraso Médio</TableHead>
                <TableHead className="text-right">Valor Vencido</TableHead>
                <TableHead className="text-right">Dias s/ Pagar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => {
                const cfg = riskCfg[item.riskLevel];
                return (
                  <TableRow key={item.customerId}>
                    <TableCell className="text-muted-foreground">{idx+1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{dn(item)}</div>
                      {item.knownName?.trim()&&<div className="text-xs text-muted-foreground">{item.customerName}</div>}
                    </TableCell>
                    <TableCell className="text-center"><span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.badge}`}>{cfg.label}</span></TableCell>
                    <TableCell className="text-right">
                      <div className="font-bold text-lg leading-none">{item.score}</div>
                      <div className="w-full bg-muted rounded-full h-1 mt-1">
                        <div className={`h-1 rounded-full ${item.score>=65?"bg-red-500":item.score>=40?"bg-orange-500":"bg-yellow-500"}`} style={{width:`${item.score}%`}}/>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-orange-600">{item.overdueCount}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">{item.recentAvgDelayDays>0?`${item.recentAvgDelayDays}d`:"—"}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">{item.overdueAmount>0?fmt(item.overdueAmount):"—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.daysSinceLastPayment!==null?`${item.daysSinceLastPayment}d`:"—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="p-3 border-t text-xs text-muted-foreground">{items.length} cliente(s) com risco de inadimplência crítica.</div>
        </Card>
      )}
    </div>
  );
}

// ── Sub-tab 16: Clientes recuperados ──────────────────────────────────────
function RecoveredSubTab({ items, months }: { items: RecoveredItem[]; months: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">Clientes Recuperados</h4>
        <InfoButton title="Como funciona este relatório?">
          <p className="text-muted-foreground">Mostra clientes que <strong>vinham atrasando e voltaram a pagar bem</strong> no período recente. Mede a eficiência da régua de cobrança.</p>
          <div className="space-y-1 text-muted-foreground text-xs border-t pt-2">
            <p>📅 Histórico: taxa de atraso ≥ 40% (era problemático)</p>
            <p>📅 Recente: taxa de atraso ≤ 25% (melhorou significativamente)</p>
            <p>✅ Melhora mínima de 20 pontos percentuais</p>
            <p>✅ Mínimo 3 títulos no histórico e 1 recente</p>
            <p>💡 <strong>Uso:</strong> reconhecer e manter clientes que responderam à cobrança — possibilidade de aumentar limites ou oferecer incentivos</p>
          </div>
        </InfoButton>
      </div>
      {items.length===0 ? (
        <BehaviorEmptyState text="Nenhum cliente recuperado identificado no período." sub={`Nenhum cliente que era problemático voltou a pagar bem nos últimos ${months} meses.`} />
      ) : (
        <>
          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="p-3 text-sm text-center">
              🎉 <span className="font-semibold text-green-700">{items.length} cliente(s)</span> recuperados nos últimos {months} meses.
            </CardContent>
          </Card>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">% Atraso Histórico</TableHead>
                  <TableHead className="text-right">% Atraso Recente ({months}m)</TableHead>
                  <TableHead className="text-right">Melhora</TableHead>
                  <TableHead className="text-right">Atraso Médio Atual</TableHead>
                  <TableHead className="text-right">Títulos Hist.</TableHead>
                  <TableHead className="text-right">Títulos Rec.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.customerId}>
                    <TableCell>
                      <div className="font-medium">{dn(item)}</div>
                      {item.knownName?.trim()&&<div className="text-xs text-muted-foreground">{item.customerName}</div>}
                    </TableCell>
                    <TableCell className="text-right text-red-500">{(item.historicalLateRate*100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{(item.recentLateRate*100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600 font-bold">▼ −{(item.improvement*100).toFixed(0)}pp</span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.recentAvgDelay>0?`${item.recentAvgDelay}d`:"Em dia"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.historicalCount}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.recentCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-3 border-t text-xs text-muted-foreground">Clientes que tinham ≥ 40% de atraso e reduziram para ≤ 25% no período recente.</div>
          </Card>
        </>
      )}
    </div>
  );
}
