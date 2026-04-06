import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  listLedger,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  confirmLedgerEntry,
  type LedgerEntry,
} from "@/api/ledger"
import { listAccounts, listChartAccounts, listCostCenters } from "@/api/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Plus, Trash2, CheckCircle, XCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { LedgerDialog, type LedgerFormValues } from "@/components/finance/LedgerDialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useAuthStore } from "@/stores/authStore"

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("pt-BR")
}

function getDefaultDateRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { from, to }
}

export function LedgerSection() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const defaultRange = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaultRange.from)
  const [dateTo, setDateTo] = useState(defaultRange.to)
  const [accountFilter, setAccountFilter] = useState<string>("__all__")
  const [operationFilter, setOperationFilter] = useState<string>("__all__")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LedgerEntry | null>(null)

  const ledger = useQuery({
    queryKey: ["ledger", { companyId, dateFrom, dateTo, accountFilter, operationFilter }],
    queryFn: () =>
      listLedger({
        dateFrom,
        dateTo,
        accountId: accountFilter !== "__all__" ? accountFilter : undefined,
        operation: operationFilter !== "__all__" ? (operationFilter as "DEBITO" | "CREDITO") : undefined,
      }),
  })

  const accounts = useQuery({
    queryKey: ["finance", "accounts", { companyId }],
    queryFn: listAccounts,
  })

  const chartAccounts = useQuery({
    queryKey: ["finance", "chartAccounts"],
    queryFn: () => listChartAccounts({ active: true }),
  })

  const costCenters = useQuery({
    queryKey: ["finance", "costCenters"],
    queryFn: listCostCenters,
  })

  const createMut = useMutation({
    mutationFn: createLedgerEntry,
    onSuccess: async () => {
      toast({ title: "Lançamento criado" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["ledger"] })
      await qc.invalidateQueries({ queryKey: ["finance", "accounts"] })
    },
    onError: (e: unknown) =>
      toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Parameters<typeof createLedgerEntry>[0] }) =>
      updateLedgerEntry(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Lançamento atualizado" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["ledger"] })
      await qc.invalidateQueries({ queryKey: ["finance", "accounts"] })
    },
    onError: (e: unknown) =>
      toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteLedgerEntry,
    onSuccess: async () => {
      toast({ title: "Lançamento excluído" })
      await qc.invalidateQueries({ queryKey: ["ledger"] })
      await qc.invalidateQueries({ queryKey: ["finance", "accounts"] })
    },
    onError: (e: unknown) =>
      toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const confirmMut = useMutation({
    mutationFn: (p: { id: string; confirmed: boolean }) => confirmLedgerEntry(p.id, p.confirmed),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["ledger"] })
      await qc.invalidateQueries({ queryKey: ["finance", "accounts"] })
    },
    onError: (e: unknown) =>
      toast({ title: "Erro ao confirmar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const totals = useMemo(() => {
    const entries = ledger.data ?? []
    const debitos = entries.filter((e) => e.operation === "DEBITO").reduce((s, e) => s + e.amount, 0)
    const creditos = entries.filter((e) => e.operation === "CREDITO").reduce((s, e) => s + e.amount, 0)
    return { debitos, creditos, saldo: creditos - debitos }
  }, [ledger.data])

  async function handleSubmit(values: LedgerFormValues) {
    const amount = parseFloat(values.amount)
    if (!values.accountId) {
      toast({ title: "Selecione uma conta", variant: "destructive" })
      return
    }
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Informe um valor válido", variant: "destructive" })
      return
    }
    const validSplits = values.splits.filter((s) => s.chartAccountId && parseFloat(s.splitAmount) > 0)
    const payload: Parameters<typeof createLedgerEntry>[0] = {
      issueDate: values.issueDate,
      paymentDate: values.paymentDate || null,
      accountId: values.accountId,
      amount,
      operation: values.operation,
      history: values.history || null,
      confirmed: values.confirmed,
      splits: validSplits.map((s) => ({
        chartAccountId: s.chartAccountId,
        costCenterId: s.costCenterId || null,
        splitAmount: parseFloat(s.splitAmount),
      })),
    }
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, body: payload })
    } else {
      await createMut.mutateAsync(payload)
    }
  }

  const isBusy = ledger.isLoading

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle>Lançamentos</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
            />
            <span className="text-muted-foreground text-sm">até</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
            />
          </div>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas as contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as contas</SelectItem>
              {(accounts.data ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} — {a.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Operação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              <SelectItem value="DEBITO">Débito</SelectItem>
              <SelectItem value="CREDITO">Crédito</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Totals summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Total Débitos</div>
            <div className="text-lg font-semibold text-red-600">{formatCurrency(totals.debitos)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Total Créditos</div>
            <div className="text-lg font-semibold text-green-600">{formatCurrency(totals.creditos)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Saldo</div>
            <div className={`text-lg font-semibold ${totals.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(totals.saldo)}
            </div>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-28">Emissão</TableHead>
                <TableHead className="w-28">Pagamento</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Histórico</TableHead>
                <TableHead className="w-24">Operação</TableHead>
                <TableHead className="w-32 text-right">Valor</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isBusy ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (ledger.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum lançamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                (ledger.data ?? []).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground text-xs">{entry.code}</TableCell>
                    <TableCell className="text-sm">{formatDate(entry.issueDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(entry.paymentDate)}</TableCell>
                    <TableCell className="text-sm">
                      {entry.account ? `${entry.account.code} — ${entry.account.description}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {entry.history ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.operation === "CREDITO" ? "default" : "secondary"}>
                        {entry.operation === "CREDITO" ? "Crédito" : "Débito"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        entry.operation === "CREDITO" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => confirmMut.mutate({ id: entry.id, confirmed: !entry.confirmed })}
                        className="flex items-center gap-1 text-xs"
                        title={entry.confirmed ? "Clique para desconfirmar" : "Clique para confirmar"}
                      >
                        {entry.confirmed ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className={entry.confirmed ? "text-green-600" : "text-muted-foreground"}>
                          {entry.confirmed ? "Confirmado" : "Pendente"}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(entry)
                            setOpen(true)
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir lançamento #{entry.code}?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMut.mutate(entry.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <LedgerDialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v)
            if (!v) setEditing(null)
          }}
          value={editing}
          accounts={accounts.data ?? []}
          chartAccounts={chartAccounts.data ?? []}
          costCenters={costCenters.data ?? []}
          loading={createMut.isPending || updateMut.isPending}
          onSubmit={handleSubmit}
        />
      </CardContent>
    </Card>
  )
}
