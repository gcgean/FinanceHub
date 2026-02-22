import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listArTitles, createArTitle, updateArTitle, deleteArTitle, type ArTitle, type TitleStatus, listCustomers, type Customer } from "@/api/canonical"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/authStore"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ArTitleDialog, type ArTitleFormValues } from "./ArTitleDialog"
import { downloadXlsx, readXlsx } from "@/utils/xlsx";
type ImportRow = {
  customerId?: string
  issueDate: string
  dueDate: string
  amount: number
  openAmount: number
  status: string
  documentNumber?: string
  notes?: string
}

export function ArTitlesSection() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [editing, setEditing] = useState<ArTitle | null>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const [take, setTake] = useState(20)
  const [page, setPage] = useState(0)
  const [range, setRange] = useState<{ from?: string; to?: string }>({})
  const titles = useQuery<{ items: ArTitle[]; total: number; take: number; skip: number }>({
    queryKey: ["canonical", "arTitles", { companyId, search, range, take, page }],
    queryFn: async () => listArTitles({ q: search, from: range.from, to: range.to, take, skip: page * take }),
  })

  const createMut = useMutation({
    mutationFn: async (values: ArTitleFormValues) => createArTitle(values),
    onSuccess: async () => {
      toast({ title: "Título criado" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "arTitles"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: async (values: ArTitleFormValues) => updateArTitle(editing!.id, values),
    onSuccess: async () => {
      toast({ title: "Título atualizado" })
      setEditing(null)
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "arTitles"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteArTitle(id),
    onSuccess: async () => {
      toast({ title: "Título excluído" })
      await qc.invalidateQueries({ queryKey: ["canonical", "arTitles"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const items = useMemo(() => titles.data?.items ?? [], [titles.data?.items])
  const total = titles.data?.total ?? 0
  const isBusy = titles.isLoading || titles.isFetching

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contas a Receber</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
          <DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(0) }} />
          <Button variant="outline" onClick={() => {
            const headers = ["customerId", "chartAccountId", "issueDate", "dueDate", "amount", "openAmount", "status", "documentNumber", "notes"]
            const rows = (titles.data?.items ?? []).map((t) => [t.customerId, t.chartAccountId, t.issueDate, t.dueDate, t.amount, t.openAmount, t.status, t.documentNumber, t.notes])
            downloadXlsx("contas_a_receber.xlsx", headers, rows, "Contas a Receber")
          }}>
            <Download className="w-4 h-4 mr-2" />
            Exportar XLSX
          </Button>
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Aberto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isBusy ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{new Date(a.dueDate).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{a.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                    <TableCell>{a.openAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                    <TableCell>{a.status}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setOpen(true) }}>
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
                              <AlertDialogTitle>Excluir título?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => { await deleteMut.mutateAsync(a.id) }}>
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
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Nenhum título encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Total: {total}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={isBusy || page === 0}>Anterior</Button>
            <div className="text-sm">Página {page + 1}</div>
            <Button variant="outline" onClick={() => setPage((p) => ((p + 1) * take < total ? p + 1 : p))} disabled={isBusy || (page + 1) * take >= total}>Próxima</Button>
            <Input className="w-16" type="number" min={1} max={200} value={take} onChange={(e) => { setTake(Number(e.target.value)); setPage(0) }} />
          </div>
        </div>
      </CardContent>
      <ArTitleDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
        value={editing}
        loading={createMut.isPending || updateMut.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMut.mutateAsync(values)
          else await createMut.mutateAsync(values)
        }}
      />
    </Card>
  )
}
