import { useState } from "react";
import { 
  Search, Filter, Download, Upload, MoreHorizontal, 
  CheckCircle, Clock, AlertCircle, Lock, Eye, Edit, Trash2,
  ArrowUpDown, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockTransactions, categories, accounts, type Transaction, type TransactionStatus } from "@/data/mockTransactionsData";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { getPresetRange, getLastNDays, getLastNWeeks, getLastNMonths } from "@/utils/dateRange";
import { downloadCsv } from "@/utils/csv";
import { downloadXlsx } from "@/utils/xlsx";

const statusConfig: Record<TransactionStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  novo: { label: 'Novo', icon: AlertCircle, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  sugerido: { label: 'Sugerido', icon: Clock, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  pendente: { label: 'Pendente', icon: AlertCircle, className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  aprovado: { label: 'Aprovado', icon: CheckCircle, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  revisado: { label: 'Revisado', icon: Eye, className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  travado: { label: 'Travado', icon: Lock, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [range, setRange] = useState<{ from?: string; to?: string }>({})

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const matchesAccount = accountFilter === "all" || t.account === accountFilter;
    const d = new Date(t.date)
    const fromOk = !range.from || d >= new Date(range.from)
    const toOk = !range.to || d <= new Date(range.to)
    return matchesSearch && matchesStatus && matchesType && matchesAccount && fromOk && toOk;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const formatCurrency = (value: number) => {
    return Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    const color = confidence >= 90 ? 'text-success' : confidence >= 70 ? 'text-warning' : 'text-destructive';
    return <span className={cn("text-xs", color)}>{confidence}%</span>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transações</h2>
          <p className="text-muted-foreground">
            {filteredTransactions.length} transações encontradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const headers = ["Data", "Descrição", "Categoria", "Conta", "Valor", "Status"]
              const rows = filteredTransactions.map((t) => [
                format(new Date(t.date), "yyyy-MM-dd"),
                t.description,
                t.category,
                t.account,
                t.value,
                t.status,
              ])
              downloadCsv("transacoes.csv", headers, rows)
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const headers = ["Data", "Descrição", "Categoria", "Conta", "Valor", "Status"]
              const rows = filteredTransactions.map((t) => [
                format(new Date(t.date), "yyyy-MM-dd"),
                t.description,
                t.category,
                t.account,
                t.value,
                t.status,
              ])
              downloadXlsx("transacoes.xlsx", headers, rows, "Transacoes")
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            XLSX
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-[260px]">
            <DateRangePicker value={range} onChange={setRange} label="Período" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setRange(getPresetRange("current_month"))}>Mês atual</Button>
            <Button variant="outline" onClick={() => setRange(getPresetRange("last_30"))}>Últimos 30</Button>
            <Button variant="outline" onClick={() => setRange(getPresetRange("quarter"))}>Trimestre</Button>
            <Button variant="outline" onClick={() => setRange(getPresetRange("year"))}>Ano</Button>
            <div className="flex items-center gap-1">
              <Input
                className="w-20"
                type="number"
                min={1}
                defaultValue={30}
                onChange={(e) => {
                  const n = Math.max(1, Number(e.target.value || 1))
                  const { from, to } = getLastNDays(n)
                  setRange({ from, to })
                }}
                placeholder="N dias"
              />
              <span className="text-xs text-muted-foreground">Últimos N dias</span>
            </div>
            <div className="flex items-center gap-1">
              <Input
                className="w-20"
                type="number"
                min={1}
                defaultValue={12}
                onChange={(e) => {
                  const n = Math.max(1, Number(e.target.value || 1))
                  const { from, to } = getLastNWeeks(n)
                  setRange({ from, to })
                }}
                placeholder="N semanas"
              />
              <span className="text-xs text-muted-foreground">Últimas N semanas</span>
            </div>
            <div className="flex items-center gap-1">
              <Input
                className="w-20"
                type="number"
                min={1}
                defaultValue={6}
                onChange={(e) => {
                  const n = Math.max(1, Number(e.target.value || 1))
                  const { from, to } = getLastNMonths(n)
                  setRange({ from, to })
                }}
                placeholder="N meses"
              />
              <span className="text-xs text-muted-foreground">Últimos N meses</span>
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {Object.entries(statusConfig).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Contas</SelectItem>
              {accounts.map(acc => (
                <SelectItem key={acc} value={acc}>{acc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedIds.length} transação(ões) selecionada(s)
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">Aprovar</Button>
              <Button size="sm" variant="outline">Categorizar</Button>
              <Button size="sm" variant="outline" className="text-destructive">Excluir</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map(transaction => {
              const StatusIcon = statusConfig[transaction.status].icon;
              return (
                <TableRow key={transaction.id} className={cn(selectedIds.includes(transaction.id) && "bg-muted/50")}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.includes(transaction.id)}
                      onCheckedChange={() => toggleSelect(transaction.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {format(new Date(transaction.date), "dd/MM/yy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground truncate max-w-[300px]">
                        {transaction.description}
                      </p>
                      {transaction.costCenter && (
                        <p className="text-xs text-muted-foreground">
                          CC: {transaction.costCenter}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm",
                        !transaction.category && "text-muted-foreground italic"
                      )}>
                        {transaction.category || "Não categorizado"}
                      </span>
                      {getConfidenceBadge(transaction.categoryConfidence)}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {transaction.account}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-medium",
                    transaction.value >= 0 ? "text-success" : "text-foreground"
                  )}>
                    {transaction.value >= 0 ? '+' : '-'}{formatCurrency(transaction.value)}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("gap-1", statusConfig[transaction.status].className)}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig[transaction.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" /> Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
