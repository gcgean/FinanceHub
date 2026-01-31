import { useState } from "react";
import { 
  FileText, Download, Calendar, TrendingUp, TrendingDown, 
  DollarSign, PieChart, BarChart3, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DRELine {
  id: string;
  description: string;
  level: number;
  currentMonth: number;
  previousMonth: number;
  ytd: number;
  isTotal?: boolean;
  isSubtotal?: boolean;
}

const dreData: DRELine[] = [
  { id: '1', description: 'RECEITA BRUTA', level: 0, currentMonth: 275000, previousMonth: 238000, ytd: 275000, isTotal: true },
  { id: '2', description: 'Receitas de Vendas', level: 1, currentMonth: 180000, previousMonth: 155000, ytd: 180000 },
  { id: '3', description: 'Receitas de Serviços', level: 1, currentMonth: 65000, previousMonth: 58000, ytd: 65000 },
  { id: '4', description: 'Receitas Recorrentes', level: 1, currentMonth: 30000, previousMonth: 25000, ytd: 30000 },
  { id: '5', description: '(-) DEDUÇÕES', level: 0, currentMonth: -14000, previousMonth: -12000, ytd: -14000, isTotal: true },
  { id: '6', description: 'Impostos sobre vendas', level: 1, currentMonth: -14000, previousMonth: -12000, ytd: -14000 },
  { id: '7', description: 'RECEITA LÍQUIDA', level: 0, currentMonth: 261000, previousMonth: 226000, ytd: 261000, isTotal: true },
  { id: '8', description: '(-) CUSTOS', level: 0, currentMonth: -95000, previousMonth: -88000, ytd: -95000, isTotal: true },
  { id: '9', description: 'Custo de Mercadorias', level: 1, currentMonth: -65000, previousMonth: -60000, ytd: -65000 },
  { id: '10', description: 'Custo de Serviços', level: 1, currentMonth: -30000, previousMonth: -28000, ytd: -30000 },
  { id: '11', description: 'LUCRO BRUTO', level: 0, currentMonth: 166000, previousMonth: 138000, ytd: 166000, isTotal: true },
  { id: '12', description: '(-) DESPESAS OPERACIONAIS', level: 0, currentMonth: -91000, previousMonth: -85000, ytd: -91000, isTotal: true },
  { id: '13', description: 'Despesas com Pessoal', level: 1, currentMonth: -55000, previousMonth: -52000, ytd: -55000 },
  { id: '14', description: 'Despesas Administrativas', level: 1, currentMonth: -18000, previousMonth: -17000, ytd: -18000 },
  { id: '15', description: 'Despesas com Marketing', level: 1, currentMonth: -12000, previousMonth: -10000, ytd: -12000 },
  { id: '16', description: 'Despesas Financeiras', level: 1, currentMonth: -6000, previousMonth: -6000, ytd: -6000 },
  { id: '17', description: 'RESULTADO OPERACIONAL', level: 0, currentMonth: 75000, previousMonth: 53000, ytd: 75000, isTotal: true },
  { id: '18', description: 'Outras Receitas/Despesas', level: 1, currentMonth: 2000, previousMonth: -1000, ytd: 2000 },
  { id: '19', description: 'RESULTADO ANTES IR/CS', level: 0, currentMonth: 77000, previousMonth: 52000, ytd: 77000, isTotal: true },
  { id: '20', description: 'IR/CSLL', level: 1, currentMonth: -12000, previousMonth: -8000, ytd: -12000 },
  { id: '21', description: 'RESULTADO LÍQUIDO', level: 0, currentMonth: 65000, previousMonth: 44000, ytd: 65000, isTotal: true },
];

const cashFlowData = [
  { month: 'Jan/26', entradas: 275000, saidas: 200000, saldo: 75000 },
  { month: 'Dez/25', entradas: 238000, saidas: 185000, saldo: 53000 },
  { month: 'Nov/25', entradas: 215000, saidas: 178000, saldo: 37000 },
  { month: 'Out/25', entradas: 198000, saidas: 165000, saldo: 33000 },
];

export default function Reports() {
  const [period, setPeriod] = useState("2026-01");
  const [reportType, setReportType] = useState("dre");

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getVariation = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatórios</h2>
          <p className="text-muted-foreground">
            DRE, Fluxo de Caixa e análises financeiras
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-01">Janeiro 2026</SelectItem>
              <SelectItem value="2025-12">Dezembro 2025</SelectItem>
              <SelectItem value="2025-11">Novembro 2025</SelectItem>
              <SelectItem value="2025-10">Outubro 2025</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receita Líquida</p>
              <p className="text-2xl font-bold text-foreground">R$ 261.000</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-xs text-success mt-2">+15.5% vs mês anterior</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Despesas Totais</p>
              <p className="text-2xl font-bold text-foreground">R$ 186.000</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <p className="text-xs text-destructive mt-2">+7.5% vs mês anterior</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Resultado Líquido</p>
              <p className="text-2xl font-bold text-success">R$ 65.000</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-xs text-success mt-2">+47.7% vs mês anterior</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Margem Líquida</p>
              <p className="text-2xl font-bold text-foreground">24.9%</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="text-xs text-success mt-2">+5.4pp vs mês anterior</p>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList>
          <TabsTrigger value="dre" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            DRE
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Fluxo de Caixa
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Por Categoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="mt-6">
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold text-foreground">Demonstração do Resultado do Exercício</h3>
              <p className="text-sm text-muted-foreground">Janeiro 2026</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Descrição</TableHead>
                  <TableHead className="text-right">Mês Atual</TableHead>
                  <TableHead className="text-right">Mês Anterior</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                  <TableHead className="text-right">YTD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dreData.map(line => {
                  const variation = getVariation(line.currentMonth, line.previousMonth);
                  return (
                    <TableRow 
                      key={line.id} 
                      className={cn(
                        line.isTotal && "bg-muted/50 font-semibold",
                        line.id === '21' && "bg-primary/5"
                      )}
                    >
                      <TableCell 
                        className={cn("font-medium")}
                        style={{ paddingLeft: `${line.level * 24 + 16}px` }}
                      >
                        {line.description}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right",
                        line.currentMonth >= 0 ? "text-foreground" : "text-destructive"
                      )}>
                        {formatCurrency(line.currentMonth)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(line.previousMonth)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right",
                        variation >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(line.ytd)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="mt-6">
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold text-foreground">Fluxo de Caixa</h3>
              <p className="text-sm text-muted-foreground">Últimos 4 meses</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Saídas</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashFlowData.map((row, idx) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right text-success">
                      +{formatCurrency(row.entradas)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      -{formatCurrency(row.saidas)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      row.saldo >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {formatCurrency(row.saldo)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Despesas por Categoria</h3>
            <div className="space-y-4">
              {[
                { category: 'Folha de Pagamento', value: 55000, percentage: 59 },
                { category: 'Despesas Administrativas', value: 18000, percentage: 19 },
                { category: 'Marketing', value: 12000, percentage: 13 },
                { category: 'Despesas Financeiras', value: 6000, percentage: 6 },
                { category: 'Outras', value: 2000, percentage: 2 },
              ].map(item => (
                <div key={item.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.category}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(item.value)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
