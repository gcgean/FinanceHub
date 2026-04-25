import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { listLedgerSplits } from "@/api/ledger"
import { listChartAccounts, listAccounts } from "@/api/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/DatePicker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { endOfMonth, format, startOfMonth } from "date-fns"

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function toDateInput(d: Date) {
  return format(d, "yyyy-MM-dd")
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const [y, m, d] = value.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

const defaultFilters = {
  dateFrom:       toDateInput(startOfMonth(new Date())),
  dateTo:         toDateInput(endOfMonth(new Date())),
  dateField:      "issueDate" as "issueDate" | "paymentDate",
  accountId:      "all",
  chartAccountId: "all",
}

export function LedgerSplitsSection() {
  const role      = useAuthStore((s) => s.user?.role)
  const companyId = useAuthStore((s) => s.companyId)
  const hydrated  = useAuthStore((s) => s.hydrated)
  const canQuery  = hydrated && (role !== "ADMIN" || Boolean(companyId))

  const [filters, setFilters]               = useState(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters)

  const accounts = useQuery({
    queryKey: ["finance", "accounts", companyId],
    enabled: canQuery,
    queryFn: listAccounts,
  })

  const chartAccounts = useQuery({
    queryKey: ["finance", "chartAccounts", companyId],
    enabled: canQuery,
    queryFn: () => listChartAccounts({ includeGlobal: true }),
  })

  const splits = useQuery({
    queryKey: ["ledger", "splits", companyId, appliedFilters],
    enabled: canQuery,
    retry: 1,
    queryFn: () =>
      listLedgerSplits({
        dateFrom:       appliedFilters.dateFrom || undefined,
        dateTo:         appliedFilters.dateTo ? `${appliedFilters.dateTo}T23:59:59` : undefined,
        dateField:      appliedFilters.dateField,
        accountId:      appliedFilters.accountId      === "all" ? undefined : appliedFilters.accountId,
        chartAccountId: appliedFilters.chartAccountId === "all" ? undefined : appliedFilters.chartAccountId,
      }),
  })

  const rows = useMemo(() => splits.data?.items ?? [], [splits.data])

  const totals = useMemo(() =>
    rows.reduce(
      (acc, s) => {
        if (s.entry.operation === "CREDITO") acc.credits += s.splitAmount
        else acc.debits += s.splitAmount
        acc.balance = acc.credits - acc.debits
        return acc
      },
      { credits: 0, debits: 0, balance: 0 }
    ),
    [rows]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lançamentos por Plano de Contas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Filtros */}
        <div className="grid grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Tipo de data</div>
            <Select
              value={filters.dateField}
              onValueChange={(v) => setFilters((p) => ({ ...p, dateField: v as "issueDate" | "paymentDate" }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="issueDate">Emissão</SelectItem>
                <SelectItem value="paymentDate">Vencimento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">De</div>
            <DatePicker value={filters.dateFrom} onChange={(v) => setFilters((p) => ({ ...p, dateFrom: v }))} />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Até</div>
            <DatePicker value={filters.dateTo} onChange={(v) => setFilters((p) => ({ ...p, dateTo: v }))} />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Plano de Contas</div>
            <Select
              value={filters.chartAccountId}
              onValueChange={(v) => setFilters((p) => ({ ...p, chartAccountId: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(chartAccounts.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} — {c.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Conta</div>
            <Select
              value={filters.accountId}
              onValueChange={(v) => setFilters((p) => ({ ...p, accountId: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(accounts.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.code} — {a.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => setAppliedFilters(filters)}
            disabled={!canQuery || splits.isFetching}
          >
            <Search className="w-4 h-4 mr-2" />
            {splits.isFetching ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        {/* Tabela */}
        <div className="rounded-md border">
          <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
            <div className="grid grid-cols-3 gap-3 p-3">
              <div>
                <div className="text-xs text-muted-foreground">Créditos</div>
                <div className="text-sm font-semibold text-emerald-600">{formatCurrency(totals.credits)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Débitos</div>
                <div className="text-sm font-semibold text-rose-600">{formatCurrency(totals.debits)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Saldo do período</div>
                <div className={"text-sm font-semibold " + (totals.balance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatCurrency(totals.balance)}
                </div>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">
                  {appliedFilters.dateField === "paymentDate" ? "Vencimento" : "Emissão"}
                </TableHead>
                <TableHead>Histórico</TableHead>
                <TableHead className="w-44">Conta</TableHead>
                <TableHead className="w-56">Plano de Contas</TableHead>
                <TableHead className="w-44">Centro de Custo</TableHead>
                <TableHead className="w-32 text-right">Valor</TableHead>
                <TableHead className="w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {role === "ADMIN" && !companyId ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Selecione uma empresa para consultar.
                  </TableCell>
                </TableRow>
              ) : splits.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : splits.isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-red-500">
                    Erro ao carregar: {(splits.error as Error).message}
                  </TableCell>
                </TableRow>
              ) : rows.length ? (
                rows.map((s) => {
                  const isCredit = s.entry.operation === "CREDITO"
                  const dateVal  = appliedFilters.dateField === "paymentDate"
                    ? s.entry.paymentDate
                    : s.entry.issueDate
                  const acc  = s.entry.account
                    ? `${s.entry.account.code} — ${s.entry.account.description}`
                    : "—"
                  const plan = `${s.chartAccount.code} — ${s.chartAccount.description}`
                  const cc   = s.costCenter
                    ? `${s.costCenter.code} — ${s.costCenter.description}`
                    : "—"
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-muted-foreground">{formatDate(dateVal)}</TableCell>
                      <TableCell>{s.entry.history ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{acc}</TableCell>
                      <TableCell className="text-muted-foreground">{plan}</TableCell>
                      <TableCell className="text-muted-foreground">{cc}</TableCell>
                      <TableCell className={"text-right tabular-nums " + (isCredit ? "text-emerald-600" : "text-rose-600")}>
                        {formatCurrency(isCredit ? s.splitAmount : -s.splitAmount)}
                      </TableCell>
                      <TableCell>
                        {s.entry.confirmed
                          ? <Badge>Confirmado</Badge>
                          : <Badge variant="secondary">Pendente</Badge>}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum lançamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
