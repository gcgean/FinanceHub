import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listApTitles, createApTitle, updateApTitle, deleteApTitle, type ApTitle, type TitleStatus } from "@/api/canonical"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2, Upload, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ApTitleDialog } from "@/components/canonical/ApTitleDialog"
import { useAuthStore } from "@/stores/authStore"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import * as XLSX from "xlsx"
import { downloadXlsx } from "@/utils/xlsx"
import { DateRangePicker } from "@/components/ui/DateRangePicker"

type ImportRow = {
  supplierId?: string | null
  issueDate?: string | null
  dueDate?: string | null
  amount?: number | string | null
  openAmount?: number | string | null
  status?: string | null
  documentNumber?: string | null
  notes?: string | null
}

export function ApTitlesSection() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<TitleStatus | undefined>(undefined)
  const [editing, setEditing] = useState<ApTitle | null>(null)
  const [open, setOpen] = useState(false)

  const [take, setTake] = useState(20)
  const [page, setPage] = useState(0)
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({})
  const titles = useQuery<{ items: ApTitle[]; total: number; take: number; skip: number }>({
    queryKey: ["canonical", "apTitles", { companyId, q: search, status, range, take, page }],
    queryFn: async () => listApTitles({ q: search, status, from: range.from?.toISOString(), to: range.to?.toISOString(), take, skip: page * take }),
  })

  const createMut = useMutation({
    mutationFn: async (payload: Parameters<typeof createApTitle>[0]) => createApTitle(payload),
    onSuccess: async () => {
      toast({ title: "Título criado" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "apTitles"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: async (payload: Parameters<typeof updateApTitle>[1]) => updateApTitle(editing!.id, payload),
    onSuccess: async () => {
      toast({ title: "Título atualizado" })
      setEditing(null); setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "apTitles"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteApTitle(id),
    onSuccess: async () => {
      toast({ title: "Título excluído" })
      await qc.invalidateQueries({ queryKey: ["canonical", "apTitles"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const items = useMemo(() => titles.data?.items ?? [], [titles.data?.items])
  const total = titles.data?.total ?? 0
  const isBusy = titles.isLoading || titles.isFetching
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contas a Pagar</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
          <DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(0) }} />
          <Button variant="outline" onClick={() => {
            const headers = ["supplierId", "issueDate", "dueDate", "amount", "openAmount", "status", "documentNumber", "notes"]
            const rows = (titles.data?.items ?? []).map((t) => [
              t.supplierId,
              t.issueDate,
              t.dueDate,
              t.amount,
              t.openAmount,
              t.status,
              t.documentNumber,
              t.notes,
            ])
            downloadXlsx("contas_a_pagar.xlsx", headers, rows, "Contas a Pagar")
          }}>
            <Download className="w-4 h-4 mr-2" />
            Exportar XLSX
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar
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
                <TableHead>Fornecedor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Aberto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isBusy ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.supplier?.name ?? 'N/A'}</TableCell>
                    <TableCell>{new Date(a.dueDate).toLocaleDateString("pt-BR")}</TableCell>
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
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Nenhum título encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ApTitleDialog
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
          value={editing}
          loading={createMut.isPending || updateMut.isPending}
          onSubmit={async (values) => {
            if (editing) {
              await updateMut.mutateAsync(values)
            } else {
              await createMut.mutateAsync(values)
            }
          }}
        />
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
    </Card>
  )
}
