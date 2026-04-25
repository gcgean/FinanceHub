import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAccountsReceivableDetail, getAccountsReceivableSummary } from "@/api/reports";
import { listCustomers, listSellers, reconcileArTitleCustomers } from "@/api/canonical";
import { downloadCsv } from "@/utils/csv";
import { downloadXlsx } from "@/utils/xlsx";
import { CheckCircle2, CreditCard, Download, FileText, Filter, List, RefreshCw, Search } from "lucide-react";
import { DateInputPicker } from "@/components/ui/DateInputPicker";

const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Retorna nome fantasia quando disponível, senão razão social */
const dn = (item: { customerName: string; knownName?: string | null }) =>
  item.knownName?.trim() || item.customerName;

export default function AccountsReceivableReports() {
  const [mainTab, setMainTab] = useState<"areceber" | "recebidas">("areceber");
  const [activeTab, setActiveTab] = useState<"summary" | "detail">("summary");
  const [receivedTab, setReceivedTab] = useState<"summary" | "detail">("summary");

  const formatForDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
  };

  const formatForValue = (displayStr: string) => {
    if (!displayStr) return "";
    const clean = displayStr.replace(/\D/g, "");
    if (clean.length === 8) {
      const d = clean.substring(0, 2);
      const m = clean.substring(2, 4);
      const y = clean.substring(4, 8);
      return `${y}-${m}-${d}`;
    }
    return displayStr;
  };

  const [dateFromInput, setDateFromInput] = useState<string>(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")
  );
  const [dateToInput, setDateToInput] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [dateFieldInput, setDateFieldInput] = useState<"issue" | "due" | "payment">("due");
  const [statusInput, setStatusInput] = useState<"ALL" | "UNPAID" | "OPEN" | "OVERDUE" | "PAID" | "CANCELED">("UNPAID");
  const [customerIdInput, setCustomerIdInput] = useState("all");
  const [sellerIdInput, setSellerIdInput] = useState("all");
  const [routeInput, setRouteInput] = useState("");
  const [indicatorInput, setIndicatorInput] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [dateFrom, setDateFrom] = useState(dateFromInput);
  const [dateTo, setDateTo] = useState(dateToInput);
  const [dateField, setDateField] = useState<"issue" | "due" | "payment">(dateFieldInput);
  const [status, setStatus] = useState<"ALL" | "UNPAID" | "OPEN" | "OVERDUE" | "PAID" | "CANCELED">(statusInput);
  const [customerId, setCustomerId] = useState(customerIdInput);
  const [sellerId, setSellerId] = useState(sellerIdInput);
  const [route, setRoute] = useState(routeInput);
  const [indicator, setIndicator] = useState(indicatorInput);
  const [search, setSearch] = useState(searchInput);
  const [hasSearched, setHasSearched] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMsg, setReconcileMsg] = useState<string | null>(null);

  const params = useMemo(() => {
    return {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      dateField: dateField as "issue" | "due" | "payment",
      status: (status === "ALL" || status === "UNPAID") ? undefined : status as "OPEN" | "OVERDUE" | "PAID" | "CANCELED",
      customerId: customerId === "all" ? undefined : customerId,
      sellerId: sellerId === "all" ? undefined : sellerId,
      route: route.trim() || undefined,
      indicator: indicator.trim() || undefined,
      q: search.trim() || undefined,
    };
  }, [dateFrom, dateTo, dateField, status, customerId, sellerId, route, indicator, search]);

  const customers = useQuery({
    queryKey: ["customers", "all"],
    queryFn: () => listCustomers({ status: "all", take: 200, skip: 0 }),
  });

  const sellers = useQuery({
    queryKey: ["sellers", "all"],
    queryFn: () => listSellers({ take: 200, skip: 0 }),
  });

  const summary = useQuery({
    queryKey: ["reports", "ar-summary", params],
    enabled: hasSearched,
    queryFn: () => getAccountsReceivableSummary(params),
  });

  const detail = useQuery({
    queryKey: ["reports", "ar-detail", params],
    enabled: hasSearched,
    queryFn: () => getAccountsReceivableDetail(params),
  });

  const receivedParams = useMemo(() => ({
    ...params,
    status: "PAID" as const,
  }), [params]);

  const received = useQuery({
    queryKey: ["reports", "ar-received", receivedParams],
    enabled: hasSearched && mainTab === "recebidas",
    queryFn: () => getAccountsReceivableDetail(receivedParams),
  });

  const receivedSummary = useQuery({
    queryKey: ["reports", "ar-received-summary", receivedParams],
    enabled: hasSearched && mainTab === "recebidas",
    queryFn: () => getAccountsReceivableSummary(receivedParams),
  });

  const totalRecebido = (received.data?.items ?? []).reduce((sum, i) => sum + (i.paidAmount ?? 0), 0);
  const totalTitulosRecebidos = received.data?.totals.totalTitulos ?? 0;
  const totalGeralRecebidas = receivedSummary.data?.totals.totalGeral ?? 0;
  const totalClientesRecebidas = receivedSummary.data?.totals.totalClientes ?? 0;
  const totalTitulosResumoRecebidas = receivedSummary.data?.totals.totalTitulos ?? 0;
  const daysAvgGeralRecebidas = receivedSummary.data?.totals.daysAvgGeral ?? 0;
  const dividaMediaRecebidas = receivedSummary.data?.totals.dividaMedia ?? 0;

  const totalGeral = summary.data?.totals.totalGeral ?? 0;
  const totalClientes = summary.data?.totals.totalClientes ?? 0;
  const totalTitulosResumo = summary.data?.totals.totalTitulos ?? 0;
  const daysAvgGeral = summary.data?.totals.daysAvgGeral ?? 0;
  const dividaMedia = summary.data?.totals.dividaMedia ?? 0;
  const totalOpen = detail.data?.totals.totalOpen ?? 0;
  const totalTitulos = detail.data?.totals.totalTitulos ?? 0;

  const handleSearch = () => {
    setDateFrom(dateFromInput);
    setDateTo(dateToInput);
    setDateField(dateFieldInput);
    setStatus(statusInput);
    setCustomerId(customerIdInput);
    setSellerId(sellerIdInput);
    setRoute(routeInput);
    setIndicator(indicatorInput);
    setSearch(searchInput);
    setHasSearched(true);
  };

  const handleReconcile = async () => {
    setReconciling(true);
    setReconcileMsg(null);
    try {
      const result = await reconcileArTitleCustomers();
      setReconcileMsg(`${result.updated} de ${result.total} títulos vinculados ao cliente.`);
    } catch {
      setReconcileMsg("Erro ao reconciliar. Verifique se os clientes foram sincronizados.");
    } finally {
      setReconciling(false);
    }
  };

  const handleExport = () => {
    if (!hasSearched) return;
    if (mainTab === "recebidas") {
      if (receivedTab === "summary") {
        const headers = ["Cod", "Nome", "Razão Social", "Documento", "Dias (média)", "Títulos", "Total", "%", "% Acum", "Classe"];
        const rows = (receivedSummary.data?.items ?? []).map((i) => [
          i.customerExternalId || "",
          dn(i),
          i.customerName,
          i.document || "",
          Number.isFinite(i.daysAvg) ? Math.round(i.daysAvg) : 0,
          i.titulos,
          i.total,
          i.percent,
          i.percentAccum,
          i.class,
        ]);
        downloadXlsx("recebidas_resumido.xlsx", headers, rows, "Resumo Recebidas", { currencyColumns: [6] });
        downloadCsv("recebidas_resumido.csv", headers, rows);
      } else {
        const headers = ["Cod", "Seq", "Cod Cliente", "Nome", "Razão Social", "Valor", "Desconto", "Acrésc", "Valor Pago", "Emissão", "Vencimento", "Dt. Pagamento", "Venda", "Vendedor", "Nº doc"];
        const rows = (received.data?.items ?? []).map((i) => [
          i.externalId || "",
          i.externalSeq || "",
          i.customerExternalId || "",
          dn(i),
          i.customerName,
          i.amount,
          i.devolucao,
          i.acrescimo,
          i.paidAmount ?? 0,
          i.issueDate,
          i.dueDate,
          i.paymentDate || "",
          i.saleExternalId || "",
          i.sellerName || "",
          i.documentNumber || "",
        ]);
        downloadXlsx("recebidas_detalhado.xlsx", headers, rows, "Recebidas Detalhado", { currencyColumns: [5, 6, 7, 8], dateColumns: [9, 10, 11] });
        downloadCsv("recebidas_detalhado.csv", headers, rows);
      }
      return;
    }
    if (activeTab === "summary") {
      const headers = ["Cod", "Nome", "Razão Social", "Documento", "Dias (média)", "Títulos", "Total", "%", "% Acum", "Classe"];
      const rows = (summary.data?.items ?? []).map((i) => [
        i.customerExternalId || "",
        dn(i),
        i.customerName,
        i.document || "",
        Number.isFinite(i.daysAvg) ? Math.round(i.daysAvg) : 0,
        i.titulos,
        i.total,
        i.percent,
        i.percentAccum,
        i.class,
      ]);
      downloadXlsx("contas_receber_resumido.xlsx", headers, rows, "Resumo", { currencyColumns: [6] });
      downloadCsv("contas_receber_resumido.csv", headers, rows);
      return;
    }
    const headers = ["Cod", "Seq", "Cod Cliente", "Nome", "Razão Social", "Valor", "Devolução", "Acrésc", "Valor líquido", "Emissão", "Dias", "Vencimento", "Venda", "Vendedor", "Cidade", "Nº Doc"];
    const rows = (detail.data?.items ?? []).map((i) => [
      i.externalId || "",
      i.externalSeq || "",
      i.customerExternalId || "",
      dn(i),
      i.customerName,
      i.amount,
      i.devolucao,
      i.acrescimo,
      i.valorLiquido,
      i.issueDate,
      i.daysOverdue,
      i.dueDate,
      i.saleExternalId || "",
      i.sellerName || "",
      i.city || "",
      i.documentNumber || "",
    ]);
    downloadXlsx("contas_receber_detalhado.xlsx", headers, rows, "Detalhado", { currencyColumns: [5, 6, 7, 8], dateColumns: [9, 11] });
    downloadCsv("contas_receber_detalhado.csv", headers, rows);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatórios de Contas a Receber</h2>
          <p className="text-muted-foreground">Acompanhamento resumido e detalhado dos títulos em aberto.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReconcile} disabled={reconciling} title="Vincula títulos sem cliente usando o código externo salvo na importação">
              <RefreshCw className={`w-4 h-4 mr-2 ${reconciling ? "animate-spin" : ""}`} />
              {reconciling ? "Reconciliando..." : "Vincular Clientes"}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={!hasSearched}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => window.print()}>
              <FileText className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
          {reconcileMsg && (
            <p className="text-xs text-muted-foreground">{reconcileMsg}</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium">Data Inicial</label>
              <DateInputPicker value={dateFromInput} onChange={setDateFromInput} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Data Final</label>
              <DateInputPicker value={dateToInput} onChange={setDateToInput} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Campo de Data</label>
              <Select value={dateFieldInput} onValueChange={(v) => setDateFieldInput(v as "issue" | "due" | "payment")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="due">Vencimento</SelectItem>
                  <SelectItem value="issue">Emissão</SelectItem>
                  <SelectItem value="payment">Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Status</label>
              <Select value={statusInput} onValueChange={(v) => setStatusInput(v as typeof statusInput)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNPAID">Em aberto</SelectItem>
                  <SelectItem value="OPEN">Em dia (não vencido)</SelectItem>
                  <SelectItem value="OVERDUE">Vencidos</SelectItem>
                  <SelectItem value="PAID">Pagos</SelectItem>
                  <SelectItem value="CANCELED">Cancelados</SelectItem>
                  <SelectItem value="ALL">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Cliente</label>
              <Select value={customerIdInput} onValueChange={setCustomerIdInput}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(customers.data?.items ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Vendedor</label>
              <Select value={sellerIdInput} onValueChange={setSellerIdInput}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(sellers.data?.items ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Rota</label>
              <Input value={routeInput} onChange={(e) => setRouteInput(e.target.value)} placeholder="Digite a rota..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Indicador</label>
              <Input value={indicatorInput} onChange={(e) => setIndicatorInput(e.target.value)} placeholder="Digite o indicador..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Busca geral</label>
              <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Cliente, documento..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "areceber" | "recebidas")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[360px]">
          <TabsTrigger value="areceber" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            A Receber
          </TabsTrigger>
          <TabsTrigger value="recebidas" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Recebidas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="areceber" className="mt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v === "detail" ? "detail" : "summary")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[420px]">
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Resumido
              </TabsTrigger>
              <TabsTrigger value="detail" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Detalhado
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6 mt-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Relatório Resumido de Contas a Receber</h3>
                <p className="text-sm text-muted-foreground">Consolidação por cliente com percentual e curva ABC.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TOTAL</div><div className="text-xl font-bold text-blue-600">{formatCurrency(totalGeral)}</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">CLIENTES</div><div className="text-xl font-bold">{totalClientes}</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TÍTULOS</div><div className="text-xl font-bold">{totalTitulosResumo}</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">DIAS MÉDIO</div><div className="text-xl font-bold">{daysAvgGeral.toFixed(1)}</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">DÍVIDA MÉDIA</div><div className="text-xl font-bold">{formatCurrency(dividaMedia)}</div></CardContent></Card>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Cod</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Dias PGTO</TableHead>
                      <TableHead className="text-right">Total (R$)</TableHead>
                      <TableHead className="text-right">Percentual (%)</TableHead>
                      <TableHead className="text-right">% Acum</TableHead>
                      <TableHead className="text-center">Classe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!hasSearched ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Clique em Buscar para carregar.</TableCell></TableRow>
                    ) : summary.isLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10">Carregando...</TableCell></TableRow>
                    ) : summary.isError ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-destructive">Erro ao carregar relatório.</TableCell></TableRow>
                    ) : (summary.data?.items.length ?? 0) === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum registro encontrado para o período.</TableCell></TableRow>
                    ) : (
                      summary.data?.items.map((item) => (
                        <TableRow key={item.customerId ?? item.customerName}>
                          <TableCell className="text-muted-foreground">{item.customerExternalId || "-"}</TableCell>
                          <TableCell>
                            <div>{dn(item)}</div>
                            {item.knownName?.trim() && <div className="text-xs text-muted-foreground">{item.customerName}</div>}
                          </TableCell>
                          <TableCell className="text-right">{item.daysAvg.toFixed(0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                          <TableCell className="text-right">{item.percent.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.percentAccum.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{item.class}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="p-4 border-t text-sm text-muted-foreground">Reg: {summary.data?.items.length ?? 0} | Média dias: {daysAvgGeral.toFixed(2)} | Total: {formatCurrency(totalGeral)} | Dívida média: {formatCurrency(dividaMedia)}</div>
              </Card>
            </TabsContent>

            <TabsContent value="detail" className="space-y-6 mt-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Relatório Detalhado de Contas a Receber</h3>
                <p className="text-sm text-muted-foreground">Listagem de títulos com vencimento, status e valores.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TOTAL EM ABERTO</div><div className="text-2xl font-bold text-blue-600">{formatCurrency(totalOpen)}</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TOTAL TÍTULOS</div><div className="text-2xl font-bold">{totalTitulos}</div></CardContent></Card>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cod</TableHead>
                      <TableHead>Seq</TableHead>
                      <TableHead>Cod Cliente</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Devolução</TableHead>
                      <TableHead className="text-right">Acrésc</TableHead>
                      <TableHead className="text-right">Valor líquido</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead className="text-right">Dias</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Venda</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Nº doc</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!hasSearched ? (
                      <TableRow><TableCell colSpan={16} className="text-center py-10 text-muted-foreground">Clique em Buscar para carregar.</TableCell></TableRow>
                    ) : detail.isLoading ? (
                      <TableRow><TableCell colSpan={16} className="text-center py-10">Carregando...</TableCell></TableRow>
                    ) : detail.isError ? (
                      <TableRow><TableCell colSpan={16} className="text-center py-10 text-destructive">Erro ao carregar relatório.</TableCell></TableRow>
                    ) : (detail.data?.items.length ?? 0) === 0 ? (
                      <TableRow><TableCell colSpan={16} className="text-center py-10 text-muted-foreground">Nenhum registro encontrado para o período.</TableCell></TableRow>
                    ) : (
                      detail.data?.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.externalId || "-"}</TableCell>
                          <TableCell>{item.externalSeq || "-"}</TableCell>
                          <TableCell>{item.customerExternalId || "-"}</TableCell>
                          <TableCell>
                            <div>{dn(item)}</div>
                            {item.knownName?.trim() && <div className="text-xs text-muted-foreground">{item.customerName}</div>}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.devolucao)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.acrescimo)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valorLiquido)}</TableCell>
                          <TableCell>{new Date(item.issueDate).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{item.daysOverdue}</TableCell>
                          <TableCell>{new Date(item.dueDate).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{item.saleExternalId || "-"}</TableCell>
                          <TableCell>{item.sellerName || "-"}</TableCell>
                          <TableCell>{item.city || "-"}</TableCell>
                          <TableCell>{item.documentNumber || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="p-4 border-t text-sm text-muted-foreground">Reg: {detail.data?.items.length ?? 0} | Valor total: {formatCurrency(totalOpen)}</div>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="recebidas" className="mt-4">
          <Tabs value={receivedTab} onValueChange={(v) => setReceivedTab(v === "detail" ? "detail" : "summary")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[420px]">
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Resumido
              </TabsTrigger>
              <TabsTrigger value="detail" className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Detalhado
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6 mt-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Resumo de Títulos Recebidos</h3>
                <p className="text-sm text-muted-foreground">Consolidação por cliente dos valores já recebidos no período.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TOTAL RECEBIDO</div><div className="text-xl font-bold text-green-600">{formatCurrency(totalGeralRecebidas)}</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">CLIENTES</div><div className="text-xl font-bold">{totalClientesRecebidas}</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TÍTULOS</div><div className="text-xl font-bold">{totalTitulosResumoRecebidas}</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">DIAS MÉDIO</div><div className="text-xl font-bold">{daysAvgGeralRecebidas.toFixed(1)}</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">MÉDIA/CLIENTE</div><div className="text-xl font-bold">{formatCurrency(dividaMediaRecebidas)}</div></CardContent></Card>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Cod</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Dias PGTO</TableHead>
                      <TableHead className="text-right">Total (R$)</TableHead>
                      <TableHead className="text-right">Percentual (%)</TableHead>
                      <TableHead className="text-right">% Acum</TableHead>
                      <TableHead className="text-center">Classe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!hasSearched ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Clique em Buscar para carregar.</TableCell></TableRow>
                    ) : receivedSummary.isLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10">Carregando...</TableCell></TableRow>
                    ) : receivedSummary.isError ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-destructive">Erro ao carregar relatório.</TableCell></TableRow>
                    ) : (receivedSummary.data?.items.length ?? 0) === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum registro encontrado para o período.</TableCell></TableRow>
                    ) : (
                      receivedSummary.data?.items.map((item) => (
                        <TableRow key={item.customerId ?? item.customerName}>
                          <TableCell className="text-muted-foreground">{item.customerExternalId || "-"}</TableCell>
                          <TableCell>
                            <div>{dn(item)}</div>
                            {item.knownName?.trim() && <div className="text-xs text-muted-foreground">{item.customerName}</div>}
                          </TableCell>
                          <TableCell className="text-right">{item.daysAvg.toFixed(0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                          <TableCell className="text-right">{item.percent.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.percentAccum.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{item.class}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="p-4 border-t text-sm text-muted-foreground">Reg: {receivedSummary.data?.items.length ?? 0} | Média dias: {daysAvgGeralRecebidas.toFixed(2)} | Total: {formatCurrency(totalGeralRecebidas)} | Média/cliente: {formatCurrency(dividaMediaRecebidas)}</div>
              </Card>
            </TabsContent>

            <TabsContent value="detail" className="space-y-6 mt-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Títulos Recebidos — Detalhado</h3>
                <p className="text-sm text-muted-foreground">Listagem de títulos com pagamento confirmado no período selecionado.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TOTAL RECEBIDO</div><div className="text-2xl font-bold text-green-600">{formatCurrency(totalRecebido)}</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TOTAL TÍTULOS</div><div className="text-2xl font-bold">{totalTitulosRecebidos}</div></CardContent></Card>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cod</TableHead>
                      <TableHead>Seq</TableHead>
                      <TableHead>Cod Cliente</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Desconto</TableHead>
                      <TableHead className="text-right">Acrésc</TableHead>
                      <TableHead className="text-right">Valor Pago</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Dt. Pagamento</TableHead>
                      <TableHead>Venda</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Nº doc</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!hasSearched ? (
                      <TableRow><TableCell colSpan={14} className="text-center py-10 text-muted-foreground">Clique em Buscar para carregar.</TableCell></TableRow>
                    ) : received.isLoading ? (
                      <TableRow><TableCell colSpan={14} className="text-center py-10">Carregando...</TableCell></TableRow>
                    ) : received.isError ? (
                      <TableRow><TableCell colSpan={14} className="text-center py-10 text-destructive">Erro ao carregar relatório.</TableCell></TableRow>
                    ) : (received.data?.items.length ?? 0) === 0 ? (
                      <TableRow><TableCell colSpan={14} className="text-center py-10 text-muted-foreground">Nenhum título recebido encontrado para o período.</TableCell></TableRow>
                    ) : (
                      received.data?.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.externalId || "-"}</TableCell>
                          <TableCell>{item.externalSeq || "-"}</TableCell>
                          <TableCell>{item.customerExternalId || "-"}</TableCell>
                          <TableCell>
                            <div>{dn(item)}</div>
                            {item.knownName?.trim() && <div className="text-xs text-muted-foreground">{item.customerName}</div>}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.devolucao)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.acrescimo)}</TableCell>
                          <TableCell className="text-right font-medium text-green-700">{formatCurrency(item.paidAmount ?? 0)}</TableCell>
                          <TableCell>{new Date(item.issueDate).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{new Date(item.dueDate).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("pt-BR") : "-"}</TableCell>
                          <TableCell>{item.saleExternalId || "-"}</TableCell>
                          <TableCell>{item.sellerName || "-"}</TableCell>
                          <TableCell>{item.documentNumber || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="p-4 border-t text-sm text-muted-foreground">Reg: {received.data?.items.length ?? 0} | Total recebido: {formatCurrency(totalRecebido)}</div>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
