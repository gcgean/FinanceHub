import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listAccounts, listChartAccounts, listCostCenters } from "@/api/finance"
import { confirmLedgerEntry, createLedgerEntry, deleteLedgerEntry, listLedger, updateLedgerEntry, type LedgerEntry } from "@/api/ledger"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pencil, Plus, Trash2, CheckCircle } from "lucide-react"
import { LedgerEntryDialog } from "@/components/ledger/LedgerEntryDialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"

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

export function LedgerSection() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    confirmed: "all" as "all" | "true" | "false",
    accountId: "all" as "all" | string,
  })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LedgerEntry | null>(null)

  const accounts = useQuery({ queryKey: ["finance", "accounts"], queryFn: listAccounts })
  const chartAccounts = useQuery({ queryKey: ["finance", "chartAccounts"], queryFn: () => listChartAccounts({ includeGlobal: true }) })
  const costCenters = useQuery({ queryKey: ["finance", "costCenters"], queryFn: listCostCenters })

  const ledger = useQuery({
    queryKey: ["ledger", filters],
    queryFn: () =>
      listLedger({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        accountId: filters.accountId === "all" ? undefined : filters.accountId,
        confirmed: filters.confirmed === "all" ? undefined : filters.confirmed === "true",
        withSplits: true,
        deleted: false,
      }),
  })

  const createMut = useMutation({
    mutationFn: createLedgerEntry,
    onSuccess: async () => {
      toast({ title: "Lançamento criado" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["ledger"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Parameters<typeof createLedgerEntry>[0] }) => updateLedgerEntry(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Lançamento atualizado" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["ledger"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const confirmMut = useMutation({
    mutationFn: (p: { id: string; confirmed: boolean }) => confirmLedgerEntry(p.id, p.confirmed),
    onSuccess: async () => {
      toast({ title: "Status atualizado" })
      await qc.invalidateQueries({ queryKey: ["ledger"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao confirmar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteLedgerEntry,
    onSuccess: async () => {
      toast({ title: "Lançamento removido" })
      await qc.invalidateQueries({ queryKey: ["ledger"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao remover", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const rows = useMemo(() => ledger.data ?? [], [ledger.data])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Livro-caixa</CardTitle>
        <Button onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo lançamento
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">De</div>
            <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Até</div>
            <Input type="date" value={filters.dateTo} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Status</div>
            <Select value={filters.confirmed} onValueChange={(v) => setFilters((p) => ({ ...p, confirmed: v as "all" | "true" | "false" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Confirmado</SelectItem>
                <SelectItem value="false">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Conta</div>
            <Select value={filters.accountId} onValueChange={(v) => setFilters((p) => ({ ...p, accountId: v }))}>
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

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Histórico</TableHead>
                <TableHead className="w-44">Conta</TableHead>
                <TableHead className="w-52">Plano</TableHead>
                <TableHead className="w-44">Centro</TableHead>
                <TableHead className="w-32 text-right">Valor</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.isLoading ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : rows.length ? (
                rows.map((e) => {
                  const split = e.splits?.[0]
                  const plan = split?.chartAccount ? `${split.chartAccount.code} — ${split.chartAccount.description}` : "—"
                  const cc = split?.costCenter ? `${split.costCenter.code} — ${split.costCenter.description}` : "—"
                  const acc = e.account ? `${e.account.code} — ${e.account.description}` : "—"
                  const amount = e.operation === "CREDITO" ? e.amount : -e.amount
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-muted-foreground">{toDateInput(e.issueDate)}</TableCell>
                      <TableCell>{e.history ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{acc}</TableCell>
                      <TableCell className="text-muted-foreground">{plan}</TableCell>
                      <TableCell className="text-muted-foreground">{cc}</TableCell>
                      <TableCell className={"text-right tabular-nums " + (amount >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {formatCurrency(amount)}
                      </TableCell>
                      <TableCell>
                        {e.confirmed ? <Badge>Confirmado</Badge> : <Badge variant="secondary">Pendente</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setOpen(true) }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={e.confirmed || confirmMut.isPending}
                            onClick={async () => {
                              await confirmMut.mutateAsync({ id: e.id, confirmed: true })
                            }}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover lançamento?</AlertDialogTitle>
                              </AlertDialogHeader>
                              <div className="text-sm text-muted-foreground">A remoção é lógica (soft delete).</div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    await deleteMut.mutateAsync(e.id)
                                  }}
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <LedgerEntryDialog
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
          value={editing}
          accounts={accounts.data ?? []}
          chartAccounts={chartAccounts.data ?? []}
          costCenters={costCenters.data ?? []}
          loading={createMut.isPending || updateMut.isPending}
          onSubmit={async (body) => {
            if (editing) {
              await updateMut.mutateAsync({ id: editing.id, body })
            } else {
              await createMut.mutateAsync(body)
            }
          }}
        />
      </CardContent>
    </Card>
  )
}
