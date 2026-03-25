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
import { listCustomers, listSellers } from "@/api/canonical";
import { downloadCsv } from "@/utils/csv";
import { downloadXlsx } from "@/utils/xlsx";
import { CreditCard, Download, FileText, Filter, List, Search } from "lucide-react";

const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AccountsReceivableReports() {
  const [activeTab, setActiveTab] = useState<"summary" | "detail">("summary");

  const [dateFromInput, setDateFromInput] = useState<string>(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")
  );
  const [dateToInput, setDateToInput] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [dateFieldInput, setDateFieldInput] = useState<"issue" | "due">("due");
  const [statusInput, setStatusInput] = useState<"ALL" | "OPEN" | "OVERDUE" | "PAID" | "CANCELED">("OPEN");
  const [customerIdInput, setCustomerIdInput] = useState("all");
  const [sellerIdInput, setSellerIdInput] = useState("all");
  const [routeInput, setRouteInput] = useState("");
  const [indicatorInput, setIndicatorInput] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [dateFrom, setDateFrom] = useState(dateFromInput);
  const [dateTo, setDateTo] = useState(dateToInput);
  const [dateField, setDateField] = useState<"issue" | "due">(dateFieldInput);
  const [status, setStatus] = useState<"ALL" | "OPEN" | "OVERDUE" | "PAID" | "CANCELED">(statusInput);
  const [customerId, setCustomerId] = useState(customerIdInput);
  const [sellerId, setSellerId] = useState(sellerIdInput);
  const [route, setRoute] = useState(routeInput);
  const [indicator, setIndicator] = useState(indicatorInput);
  const [search, setSearch] = useState(searchInput);
  const [hasSearched, setHasSearched] = useState(false);

  const params = useMemo(() => {
    return {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      dateField,
      status: status === "ALL" ? undefined : status,
      customerId: customerId === "all" ? undefined : customerId,
      sellerId: sellerId === "all" ? undefined : sellerId,
      route: route.trim() || undefined,
      indicator: indicator.trim() || undefined,
      q: search.trim() || undefined,
    };
  }, [dateFrom, dateTo, dateField, status, customerId, sellerId, route, indicator, search]);

  const customers = useQuery({
    queryKey: ["customers", "all"],
    queryFn: () => listCustomers({ status: "all", take: 500, skip: 0 }),
  });

  const sellers = useQuery({
    queryKey: ["sellers", "all"],
    queryFn: () => listSellers({ take: 500, skip: 0 }),
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

  const totalGeral = summary.data?.totals.totalGeral ?? 0;
  const totalClientes = summary.data?.totals.totalClientes ?? 0;
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

  const handleExport = () => {
    if (!hasSearched) return;
    if (activeTab === "summary") {
      const headers = ["Cliente", "Nome conhecido", "Documento", "Dias (média)", "Total", "%", "% Acum", "Classe"];
      const rows = (summary.data?.items ?? []).map((i) => [
        i.customerName,
        i.knownName || "",
        i.document || "",
        Number.isFinite(i.daysAvg) ? Math.round(i.daysAvg) : 0,
        i.total,
        i.percent,
        i.percentAccum,
        i.class,
      ]);
      downloadXlsx("contas_receber_resumido.xlsx", headers, rows, "Resumo", { currencyColumns: [4] });
      downloadCsv("contas_receber_resumido.csv", headers, rows);
      return;
    }
    const headers = ["Vencimento", "Dias", "Cliente", "Documento", "Valor", "Aberto", "Status", "Nº Doc"];
    const rows = (detail.data?.items ?? []).map((i) => [
      i.dueDate,
      i.daysOverdue,
      i.customerName,
      i.document || "",
      i.amount,
      i.openAmount,
      i.status,
      i.documentNumber || "",
    ]);
    downloadXlsx("contas_receber_detalhado.xlsx", headers, rows, "Detalhado", { currencyColumns: [4, 5], dateColumns: [0] });
    downloadCsv("contas_receber_detalhado.csv", headers, rows);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatórios de Contas a Receber</h2>
          <p className="text-muted-foreground">Acompanhamento resumido e detalhado dos títulos em aberto.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!hasSearched}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => window.print()}>
            <FileText className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
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
              <Input type="date" value={dateFromInput} onChange={(e) => setDateFromInput(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Data Final</label>
              <Input type="date" value={dateToInput} onChange={(e) => setDateToInput(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Campo de Data</label>
              <Select value={dateFieldInput} onValueChange={(v) => setDateFieldInput(v === "issue" ? "issue" : "due")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="due">Vencimento</SelectItem>
                  <SelectItem value="issue">Emissão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Status</label>
              <Select value={statusInput} onValueChange={(v) => setStatusInput(v as typeof statusInput)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Em aberto</SelectItem>
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v === "detail" ? "detail" : "summary")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[420px]">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            A Receber Resumido
          </TabsTrigger>
          <TabsTrigger value="detail" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            A Receber Detalhado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6 mt-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Relatório Resumido de Contas a Receber</h3>
            <p className="text-sm text-muted-foreground">Consolidação por cliente com percentual e curva ABC.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TOTAL EM ABERTO</div><div className="text-2xl font-bold text-blue-600">{formatCurrency(totalGeral)}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">CLIENTES</div><div className="text-2xl font-bold">{totalClientes}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">TÍTULOS</div><div className="text-2xl font-bold">{totalTitulos}</div></CardContent></Card>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Nome conhecido</TableHead>
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
                      <TableCell>{item.customerName}</TableCell>
                      <TableCell>{item.knownName || "-"}</TableCell>
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
            <div className="p-4 border-t text-sm text-muted-foreground">Registros: {summary.data?.items.length ?? 0}</div>
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
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Aberto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nº Doc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hasSearched ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Clique em Buscar para carregar.</TableCell></TableRow>
                ) : detail.isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10">Carregando...</TableCell></TableRow>
                ) : detail.isError ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-destructive">Erro ao carregar relatório.</TableCell></TableRow>
                ) : (detail.data?.items.length ?? 0) === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhum registro encontrado para o período.</TableCell></TableRow>
                ) : (
                  detail.data?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.dueDate).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">{item.daysOverdue}</TableCell>
                      <TableCell>{item.customerName}</TableCell>
                      <TableCell>{item.document || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.openAmount)}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell>{item.documentNumber || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="p-4 border-t text-sm text-muted-foreground">Registros: {detail.data?.items.length ?? 0}</div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
