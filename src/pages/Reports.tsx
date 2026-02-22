import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { listAccounts } from "@/api/finance"
import { getStatement, runDre } from "@/api/reports"
import { getPresetRange } from "@/utils/dateRange"
import { downloadCsv } from "@/utils/csv"
import { downloadXlsx } from "@/utils/xlsx"
import { downloadXlsxMulti } from "@/utils/xlsx"
import { getLastNDays, getLastNWeeks, getLastNMonths } from "@/utils/dateRange"
import { mockTransactions } from "@/data/mockTransactionsData"

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function toDateInput(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

import { DateRangePicker } from "@/components/ui/DateRangePicker"

export default function Reports() {
  const accounts = useQuery({ queryKey: ["finance", "accounts"], queryFn: listAccounts })

  const [tab, setTab] = useState<"statement" | "dre">("statement")

  const [statementRange, setStatementRange] = useState<{ from?: string; to?: string }>({ from: "2026-01-01", to: "2026-01-31" })
  const [statementAccountId, setStatementAccountId] = useState<"all" | string>("all")
  const [statementRun, setStatementRun] = useState(0)
  const statement = useQuery({
    queryKey: ["reports", "statement", { range: statementRange, accountId: statementAccountId }, statementRun],
    enabled: statementRun > 0,
    queryFn: () =>
      getStatement({
        dateFrom: statementRange.from || undefined,
        dateTo: statementRange.to || undefined,
        accountId: statementAccountId === "all" ? undefined : statementAccountId,
      }),
  })

  const [dreRange, setDreRange] = useState<{ from?: string; to?: string }>({ from: "2026-01-01", to: "2026-01-31" })
  const [dreRun, setDreRun] = useState(0)
  const dre = useQuery({
    queryKey: ["reports", "dre", dreRange, dreRun],
    enabled: dreRun > 0,
    queryFn: () => runDre({ dateFrom: dreRange.from ?? "2026-01-01", dateTo: dreRange.to ?? "2026-01-31" }),
  })

  const statementTotals = statement.data?.totals
  const dreIndicadores = dre.data?.indicadores

  const dreList = useMemo(() => {
    return dre.data?.listagem ?? []
  }, [dre.data?.listagem])

  return (
    <div className="p-6 space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v === "dre" ? "dre" : "statement")}>
        <TabsList>
          <TabsTrigger value="statement">Extrato</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="statement" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Extrato (Statement)</CardTitle>
              <Button onClick={() => setStatementRun((n) => n + 1)} disabled={statement.isFetching}>
                {statement.isFetching ? "Gerando..." : "Gerar"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1 col-span-2">
                  <div className="text-xs text-muted-foreground">Período</div>
                  <DateRangePicker value={statementRange} onChange={(v) => setStatementRange(v)} />
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setStatementRange(getPresetRange("current_month"))}>Mês atual</Button>
                    <Button variant="outline" size="sm" onClick={() => setStatementRange(getPresetRange("last_30"))}>Últimos 30</Button>
                    <Button variant="outline" size="sm" onClick={() => setStatementRange(getPresetRange("quarter"))}>Trimestre</Button>
                    <Button variant="outline" size="sm" onClick={() => setStatementRange(getPresetRange("year"))}>Ano</Button>
                    <Input
                      className="w-20"
                      type="number"
                      min={1}
                      defaultValue={30}
                      onChange={(e) => setStatementRange(getLastNDays(Math.max(1, Number(e.target.value || 1))))}
                      placeholder="N dias"
                    />
                    <Input
                      className="w-20"
                      type="number"
                      min={1}
                      defaultValue={12}
                      onChange={(e) => setStatementRange(getLastNWeeks(Math.max(1, Number(e.target.value || 1))))}
                      placeholder="N semanas"
                    />
                    <Input
                      className="w-20"
                      type="number"
                      min={1}
                      defaultValue={6}
                      onChange={(e) => setStatementRange(getLastNMonths(Math.max(1, Number(e.target.value || 1))))}
                      placeholder="N meses"
                    />
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="text-xs text-muted-foreground">Conta</div>
                  <Select value={statementAccountId} onValueChange={(v) => setStatementAccountId(v)}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {(accounts.data ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.code} — {a.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!statement.data?.items?.length}
                      onClick={() => {
                        const items = statement.data?.items ?? []
                        const headers = ["Data", "Operação", "Valor", "Histórico", "Conta", "Saldo após", "Confirmado"]
                        const rows = items.map((i) => [
                          toDateInput(i.issueDate),
                          i.operation,
                          i.amount,
                          i.history ?? "",
                          i.accountDescription ?? "",
                          i.balanceAfter ?? "",
                          i.confirmed ? "Sim" : "Não",
                        ])
                        downloadCsv("extrato.csv", headers, rows)
                      }}
                    >
                      Exportar CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      disabled={!statement.data?.items?.length}
                      onClick={() => {
                        const items = statement.data?.items ?? []
                        const headers = ["Data", "Operação", "Valor", "Histórico", "Conta", "Saldo após", "Confirmado"]
                        const rows = items.map((i) => [
                          toDateInput(i.issueDate),
                          i.operation,
                          i.amount,
                          i.history ?? "",
                          i.accountDescription ?? "",
                          i.balanceAfter ?? "",
                          i.confirmed ? "Sim" : "Não",
                        ])
                        downloadXlsx("extrato.xlsx", headers, rows, "Extrato")
                      }}
                    >
                      Exportar XLSX
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!statement.data?.items?.length && !dreList.length}
                  onClick={() => {
                    const tRange = dreRange.from || statementRange.from ? dreRange : statementRange
                    const tFrom = tRange.from
                    const tTo = tRange.to
                    const tx = mockTransactions.filter((t) => {
                      const d = new Date(t.date)
                      const fromOk = !tFrom || d >= new Date(tFrom)
                      const toOk = !tTo || d <= new Date(tTo)
                      const accOk = statementAccountId === "all"
                        ? true
                        : (() => {
                            const acc = (accounts.data ?? []).find((a) => a.id === statementAccountId)
                            return acc ? t.account === acc.description : true
                          })()
                      return fromOk && toOk && accOk
                    })
                    const txHeaders = ["Data", "Descrição", "Categoria", "Conta", "Valor", "Status"]
                    const txRows = tx.map((t) => [
                      (new Date(t.date)).toISOString().slice(0, 10),
                      t.description,
                      t.category,
                      t.account,
                      t.value,
                      t.status,
                    ])
                    const stHeaders = ["Data", "Operação", "Valor", "Histórico", "Conta", "Saldo após", "Confirmado"]
                    const stRows = (statement.data?.items ?? []).map((i) => [
                      toDateInput(i.issueDate),
                      i.operation,
                      i.amount,
                      i.history ?? "",
                      i.accountDescription ?? "",
                      i.balanceAfter ?? "",
                      i.confirmed ? "Sim" : "Não",
                    ])
                    const dreHeaders = ["Código", "Descrição", "Tipo", "Valor", "Total", "RE"]
                    const dreRows = dreList.map((l) => [l.code, l.description, l.type, l.value, l.total, l.revenueExpense])
                    downloadXlsxMulti("financehub.xlsx", [
                      { name: "Transacoes", headers: txHeaders, rows: txRows, currencyColumns: [4], dateColumns: [0] },
                      { name: "Extrato", headers: stHeaders, rows: stRows, currencyColumns: [2, 5], dateColumns: [0] },
                      { name: "DRE", headers: dreHeaders, rows: dreRows, currencyColumns: [3, 4] },
                    ])
                  }}
                >
                  Exportar XLSX (multi-aba)
                </Button>
              </div>

              {statementTotals ? (
                <div className="grid grid-cols-5 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Saldo inicial</div>
                    <div className="text-sm font-medium tabular-nums">{formatCurrency(statementTotals.opening_balance)}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Entradas</div>
                    <div className="text-sm font-medium tabular-nums text-emerald-600">{formatCurrency(statementTotals.inputs)}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Saídas</div>
                    <div className="text-sm font-medium tabular-nums text-rose-600">{formatCurrency(statementTotals.outputs)}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Saldo final</div>
                    <div className="text-sm font-medium tabular-nums">{formatCurrency(statementTotals.closing_balance)}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Pendentes</div>
                    <div className="text-sm font-medium tabular-nums">{statementTotals.to_confirm_qty} ({formatCurrency(statementTotals.to_confirm_value)})</div>
                  </Card>
                </div>
              ) : null}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Data</TableHead>
                      <TableHead>Histórico</TableHead>
                      <TableHead className="w-44">Conta</TableHead>
                      <TableHead className="w-32 text-right">Valor</TableHead>
                      <TableHead className="w-32 text-right">Saldo</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.isFetching ? (
                      <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : statement.isError ? (
                      <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">Falha ao gerar extrato.</TableCell></TableRow>
                    ) : statement.data?.items?.length ? (
                      statement.data.items.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="text-muted-foreground">{toDateInput(i.issueDate)}</TableCell>
                          <TableCell>{i.history ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{i.accountDescription ?? "—"}</TableCell>
                          <TableCell className={"text-right tabular-nums " + (i.operation === "CREDITO" ? "text-emerald-600" : "text-rose-600")}>
                            {formatCurrency(i.operation === "CREDITO" ? i.amount : -i.amount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{i.balanceAfter === null ? "—" : formatCurrency(i.balanceAfter)}</TableCell>
                          <TableCell>
                            {i.confirmed ? <Badge>Confirmado</Badge> : <Badge variant="secondary">Pendente</Badge>}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Sem dados para o período.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dre" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>DRE</CardTitle>
              <Button onClick={() => setDreRun((n) => n + 1)} disabled={dre.isFetching}>
                {dre.isFetching ? "Executando..." : "Executar"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <div className="text-xs text-muted-foreground">Período</div>
                  <DateRangePicker value={dreRange} onChange={(v) => setDreRange(v)} />
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDreRange(getPresetRange("current_month"))}>Mês atual</Button>
                    <Button variant="outline" size="sm" onClick={() => setDreRange(getPresetRange("last_30"))}>Últimos 30</Button>
                    <Button variant="outline" size="sm" onClick={() => setDreRange(getPresetRange("quarter"))}>Trimestre</Button>
                    <Button variant="outline" size="sm" onClick={() => setDreRange(getPresetRange("year"))}>Ano</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!dreList.length}
                      onClick={() => {
                        const headers = ["Código", "Descrição", "Tipo", "Valor", "Total", "RE"]
                        const rows = dreList.map((l) => [l.code, l.description, l.type, l.value, l.total, l.revenueExpense])
                        downloadCsv("dre.csv", headers, rows)
                      }}
                    >
                      Exportar CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      disabled={!dreList.length}
                      onClick={() => {
                        const headers = ["Código", "Descrição", "Tipo", "Valor", "Total", "RE"]
                        const rows = dreList.map((l) => [l.code, l.description, l.type, l.value, l.total, l.revenueExpense])
                        downloadXlsx("dre.xlsx", headers, rows, "DRE")
                      }}
                    >
                      Exportar XLSX
                    </Button>
                  </div>
                </div>
              </div>

              {dreIndicadores ? (
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Receita bruta</div>
                    <div className="text-sm font-medium tabular-nums">{formatCurrency(dreIndicadores.receita_bruta)}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Lucro líquido</div>
                    <div className={"text-sm font-medium tabular-nums " + (dreIndicadores.lucro_liquido >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {formatCurrency(dreIndicadores.lucro_liquido)}
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Margem</div>
                    <div className="text-sm font-medium tabular-nums">{dreIndicadores.margem.toFixed(2)}%</div>
                  </Card>
                </div>
              ) : null}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-36">Tipo</TableHead>
                      <TableHead className="w-40 text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dre.isFetching ? (
                      <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : dre.isError ? (
                      <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-destructive">Falha ao executar DRE.</TableCell></TableRow>
                    ) : dreList.length ? (
                      dreList.map((l, idx) => (
                        <TableRow key={`${l.code}-${idx}`} className={l.type !== "ACCOUNT" ? "bg-muted/40" : undefined}>
                          <TableCell className="font-medium">{l.code}</TableCell>
                          <TableCell>{l.description}</TableCell>
                          <TableCell className="text-muted-foreground">{l.type}</TableCell>
                          <TableCell className={"text-right tabular-nums " + (l.value >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {formatCurrency(l.value)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Sem dados para o período.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
