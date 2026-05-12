import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Search, Trash2, Pencil } from "lucide-react"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { createTransaction, deleteTransaction, listAccounts, listCategories, listTransactions, updateTransaction, type Transaction } from "@/api/finance"
import { TransactionDialog } from "@/components/finance/TransactionDialog"

const statusLabel: Record<Transaction["status"], string> = {
  NEW: "Novo",
  SUGGESTED: "Sugerido",
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REVIEWED: "Revisado",
  LOCKED: "Travado",
}

function formatCurrency(value: number) {
  return Math.abs(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default function Transactions() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<Transaction["status"] | "all">("all")
  const [type, setType] = useState<Transaction["type"] | "all">("all")
  const [account, setAccount] = useState<string | "all">("all")
  const [range, setRange] = useState<{ from?: string; to?: string }>({})
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const accounts = useQuery({
    queryKey: ["finance", "accounts"],
    queryFn: listAccounts,
  })

  const categories = useQuery({
    queryKey: ["finance", "categories"],
    queryFn: listCategories,
  })

  const txs = useQuery({
    queryKey: ["finance", "transactions", { status, type, range }],
    queryFn: () =>
      listTransactions({
        take: 200,
        status: status === "all" ? undefined : status,
        type: type === "all" ? undefined : type,
        dateFrom: range.from,
        dateTo: range.to,
      }),
  })

  const createMut = useMutation({
    mutationFn: createTransaction,
    onSuccess: async () => {
      toast({ title: "Transação criada" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["finance", "transactions"] })
      await qc.invalidateQueries({ queryKey: ["financehub", "summary"] })
      await qc.invalidateQueries({ queryKey: ["financehub", "recent"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<Parameters<typeof createTransaction>[0]> }) => updateTransaction(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Transação atualizada" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["finance", "transactions"] })
      await qc.invalidateQueries({ queryKey: ["financehub", "summary"] })
      await qc.invalidateQueries({ queryKey: ["financehub", "recent"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteTransaction(id),
    onSuccess: async () => {
      toast({ title: "Transação excluída" })
      await qc.invalidateQueries({ queryKey: ["finance", "transactions"] })
      await qc.invalidateQueries({ queryKey: ["financehub", "summary"] })
      await qc.invalidateQueries({ queryKey: ["financehub", "recent"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const accountOptions = useMemo(() => (accounts.data ?? []).map((a) => a.description), [accounts.data])

  const filtered = useMemo(() => {
    const list = txs.data?.items ?? []
    const q = search.trim().toLowerCase()
    return list.filter((t) => {
      const searchOk = !q || t.description.toLowerCase().includes(q)
      const accountOk = account === "all" || t.account === account
      return searchOk && accountOk
    })
  }, [account, search, txs.data?.items])

  const isBusy = accounts.isLoading || categories.isLoading || txs.isLoading
  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transações</h2>
          <p className="text-muted-foreground">{filtered.length} itens</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por descrição..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="w-[260px]">
            <DateRangePicker value={range} onChange={setRange} label="Período" />
          </div>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="REVENUE">Receitas</SelectItem>
              <SelectItem value="EXPENSE">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusLabel).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={account} onValueChange={(v) => setAccount(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {accountOptions.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-48">Categoria</TableHead>
                <TableHead className="w-48">Conta</TableHead>
                <TableHead className="w-36 text-right">Valor</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isBusy ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length ? (
                filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{new Date(t.date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.description}</div>
                        <div className="text-xs text-muted-foreground">{t.type === "REVENUE" ? "Receita" : "Despesa"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.category ? <Badge variant="outline">{t.category}</Badge> : <span className="text-sm text-muted-foreground italic">Sem categoria</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.account}</Badge>
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums font-mono font-semibold", t.value >= 0 ? "text-success" : "text-destructive")}>
                      {t.value >= 0 ? "+" : "-"}{formatCurrency(t.value)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabel[t.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setOpen(true) }}>
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
                              <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => { await deleteMut.mutateAsync(t.id) }}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Nenhuma transação encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <TransactionDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
        value={editing}
        accounts={accountOptions}
        categories={categories.data ?? []}
        loading={isSaving}
        onSubmit={async (values) => {
          const desc = values.description.trim()
          const acc = values.account.trim()
          if (!desc || !acc) {
            toast({ title: "Preencha descrição e conta", variant: "destructive" })
            return
          }
          const signedValue = values.type === "EXPENSE" ? -Math.abs(values.amount) : Math.abs(values.amount)
          const payload = {
            date: values.date,
            description: desc,
            value: signedValue,
            type: values.type,
            status: values.status,
            account: acc,
            category: (values.category ?? "").trim(),
          }
          if (editing) {
            await updateMut.mutateAsync({ id: editing.id, body: payload })
          } else {
            await createMut.mutateAsync(payload)
          }
        }}
      />
    </div>
  )
}

