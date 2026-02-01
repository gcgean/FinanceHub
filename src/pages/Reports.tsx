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

export default function Reports() {
  const accounts = useQuery({ queryKey: ["finance", "accounts"], queryFn: listAccounts })

  const [tab, setTab] = useState<"statement" | "dre">("statement")

  const [statementFilters, setStatementFilters] = useState({
    dateFrom: "2026-01-01",
    dateTo: "2026-01-31",
    accountId: "all" as "all" | string,
  })
  const [statementRun, setStatementRun] = useState(0)
  const statement = useQuery({
    queryKey: ["reports", "statement", statementFilters, statementRun],
    enabled: statementRun > 0,
    queryFn: () =>
      getStatement({
        dateFrom: statementFilters.dateFrom || undefined,
        dateTo: statementFilters.dateTo || undefined,
        accountId: statementFilters.accountId === "all" ? undefined : statementFilters.accountId,
      }),
  })

  const [dreFilters, setDreFilters] = useState({
    dateFrom: "2026-01-01",
    dateTo: "2026-01-31",
  })
  const [dreRun, setDreRun] = useState(0)
  const dre = useQuery({
    queryKey: ["reports", "dre", dreFilters, dreRun],
    enabled: dreRun > 0,
    queryFn: () => runDre({ dateFrom: dreFilters.dateFrom, dateTo: dreFilters.dateTo }),
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
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">De</div>
                  <Input type="date" value={statementFilters.dateFrom} onChange={(e) => setStatementFilters((p) => ({ ...p, dateFrom: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Até</div>
                  <Input type="date" value={statementFilters.dateTo} onChange={(e) => setStatementFilters((p) => ({ ...p, dateTo: e.target.value }))} />
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="text-xs text-muted-foreground">Conta</div>
                  <Select value={statementFilters.accountId} onValueChange={(v) => setStatementFilters((p) => ({ ...p, accountId: v }))}>
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
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">De</div>
                  <Input type="date" value={dreFilters.dateFrom} onChange={(e) => setDreFilters((p) => ({ ...p, dateFrom: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Até</div>
                  <Input type="date" value={dreFilters.dateTo} onChange={(e) => setDreFilters((p) => ({ ...p, dateTo: e.target.value }))} />
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
