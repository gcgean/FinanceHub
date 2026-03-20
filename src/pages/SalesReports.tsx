import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Filter, FileText, Search, CreditCard, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SalesReportResponse = {
  items: Array<{
    id: string;
    externalId: string | null;
    date: string;
    customerName: string;
    customerCity: string;
    sellerName: string;
    cashierName: string;
    paymentMethod: string;
    status: string;
    totalBruto: number;
    totalDevolvido: number;
    totalLiquido: number;
  }>;
  totals: {
    qty: number;
    bruto: number;
    devolvido: number;
    liquido: number;
    ticket_medio: number;
  };
};

type PaymentMethodReportResponse = {
  items: Array<{
    id: string;
    name: string;
    qty: number;
    total: number;
    percentage: number;
  }>;
  grandTotal: number;
};

export default function SalesReports() {
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
    return displayStr; // Fallback
  };

  const [dateFromInput, setDateFromInput] = useState<string>(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")
  );
  const [dateToInput, setDateToInput] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [statusInput, setStatusInput] = useState<string>("ALL");

  const [filterDateFrom, setFilterDateFrom] = useState<string>(dateFromInput);
  const [filterDateTo, setFilterDateTo] = useState<string>(dateToInput);
  const [filterStatus, setFilterStatus] = useState<string>(statusInput);

  const { data: salesData, isLoading: isLoadingSales, isError: isErrorSales, refetch: refetchSales } = useQuery({
    queryKey: ["reports", "sales", filterDateFrom, filterDateTo, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterDateFrom) params.append("dateFrom", filterDateFrom);
      if (filterDateTo) params.append("dateTo", filterDateTo);
      if (filterStatus !== "ALL") {
        params.append("status", filterStatus);
      }
      const res = await apiFetch<SalesReportResponse>(`/reports/sales?${params.toString()}`);
      return res;
    },
    enabled: false, 
  });

  const { data: paymentData, isLoading: isLoadingPayment, isError: isErrorPayment, refetch: refetchPayment } = useQuery({
    queryKey: ["reports", "sales-by-payment-method", filterDateFrom, filterDateTo, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterDateFrom) params.append("dateFrom", filterDateFrom);
      if (filterDateTo) params.append("dateTo", filterDateTo);
      if (filterStatus !== "ALL") {
        params.append("status", filterStatus);
      }
      const res = await apiFetch<PaymentMethodReportResponse>(`/reports/sales-by-payment-method?${params.toString()}`);
      return res;
    },
    enabled: false,
  });

  const handleSearch = () => {
    setFilterDateFrom(dateFromInput);
    setFilterDateTo(dateToInput);
    setFilterStatus(statusInput);
    setTimeout(() => {
      refetchSales();
      refetchPayment();
    }, 0);
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDate = (isoStr: string) => {
    try {
      return format(new Date(isoStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatórios de Vendas</h2>
          <p className="text-muted-foreground">Acompanhamento e listagens de vendas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button>
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
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium">Data Inicial</label>
              <Input 
                type="text" 
                placeholder="DD/MM/YYYY"
                maxLength={10}
                value={formatForDisplay(dateFromInput)} 
                onChange={(e) => {
                  const val = e.target.value;
                  const clean = val.replace(/\D/g, "");
                  if (clean.length === 8) {
                    setDateFromInput(formatForValue(val));
                  } else {
                    setDateFromInput(val); 
                  }
                }} 
                className="w-32"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Data Final</label>
              <Input 
                type="text" 
                placeholder="DD/MM/YYYY"
                maxLength={10}
                value={formatForDisplay(dateToInput)} 
                onChange={(e) => {
                  const val = e.target.value;
                  const clean = val.replace(/\D/g, "");
                  if (clean.length === 8) {
                    setDateToInput(formatForValue(val));
                  } else {
                    setDateToInput(val); 
                  }
                }} 
                className="w-32"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Status</label>
              <Select value={statusInput} onValueChange={setStatusInput}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Vendas</SelectItem>
                  <SelectItem value="FINALIZADA">Finalizadas</SelectItem>
                  <SelectItem value="CANCELADA">Canceladas</SelectItem>
                  <SelectItem value="DEVOLVIDA">Devolvidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} className="mb-0.5">
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Vendas em Geral
          </TabsTrigger>
          <TabsTrigger value="formas-pgto" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Formas de Pagamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6 mt-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Relatório de Vendas em Geral</h3>
            <p className="text-sm text-muted-foreground">Listagem das vendas em geral com totais e ticket médio.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Bruto</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(salesData?.totals.bruto ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Devolvido</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(salesData?.totals.devolvido ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Líquido</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(salesData?.totals.liquido ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Ticket Médio</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(salesData?.totals.ticket_medio ?? 0)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Status</TableHead>
                    <TableHead>Cod Ven</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Nome Cliente</TableHead>
                    <TableHead className="text-right">Total Bruto</TableHead>
                    <TableHead className="text-right">Total Devolvido</TableHead>
                    <TableHead className="text-right">Total Líquido</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Cidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSales ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10">Carregando...</TableCell>
                    </TableRow>
                  ) : isErrorSales ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-destructive">Erro ao carregar relatório.</TableCell>
                    </TableRow>
                  ) : !salesData || salesData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Nenhuma venda encontrada para o período.</TableCell>
                    </TableRow>
                  ) : (
                    salesData.items.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <Badge variant={!sale.status || sale.status === "FINALIZADA" || sale.status === "OK" ? "default" : sale.status === "CANCELADA" ? "destructive" : "secondary"}>
                            {sale.status === "OK" || !sale.status ? "FINALIZADA" : sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{sale.externalId || "N/A"}</TableCell>
                        <TableCell>{formatDate(sale.date)}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={sale.customerName}>
                          {sale.customerName}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(sale.totalBruto)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(sale.totalDevolvido)}</TableCell>
                        <TableCell className="text-right text-primary font-bold">{formatCurrency(sale.totalLiquido)}</TableCell>
                        <TableCell>{sale.sellerName}</TableCell>
                        <TableCell>{sale.customerCity || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t text-xs text-muted-foreground flex justify-between">
              <span>Registros: {salesData?.totals.qty ?? 0}</span>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="formas-pgto" className="space-y-6 mt-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Relatório de Vendas por Formas de Pagamento</h3>
            <p className="text-sm text-muted-foreground">Listagem de valores consolidados por tipo de pagamento.</p>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Cod Forma Pgt</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Percentual (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPayment ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">Carregando...</TableCell>
                    </TableRow>
                  ) : isErrorPayment ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-destructive">Erro ao carregar relatório.</TableCell>
                    </TableRow>
                  ) : !paymentData || paymentData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhuma forma de pagamento encontrada para o período.</TableCell>
                    </TableRow>
                  ) : (
                    paymentData.items.map((pm) => (
                      <TableRow key={pm.id}>
                        <TableCell className="font-medium">{pm.id}</TableCell>
                        <TableCell>{pm.name}</TableCell>
                        <TableCell className="text-right">{pm.qty}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(pm.total)}</TableCell>
                        <TableCell className="text-right">{pm.percentage.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t text-sm font-semibold flex justify-between bg-muted/20">
              <div className="flex gap-8">
                <span>Reg: {paymentData?.items.length ?? 0}</span>
              </div>
              <div className="text-primary">
                Total: {formatCurrency(paymentData?.grandTotal ?? 0)}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
