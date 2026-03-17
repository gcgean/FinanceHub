import { useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, upsertPaymentMethods, PaymentMethod } from "@/api/canonical"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { PaymentMethodDialog } from "./PaymentMethodDialog"
import { toast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import * as XLSX from "xlsx"
import { downloadXlsx } from "@/utils/xlsx"

export function PaymentMethodsTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [take, setTake] = useState(20)
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const pmQuery = useQuery({
    queryKey: ["canonical", "payment-methods", { q: search, take, page }],
    queryFn: async () => listPaymentMethods({ q: search, take, skip: page * take }),
  })

  const createMut = useMutation({
    mutationFn: createPaymentMethod,
    onSuccess: () => {
      toast({ title: "Forma de pagamento criada" })
      setOpen(false)
      qc.invalidateQueries({ queryKey: ["canonical", "payment-methods"] })
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (data: Parameters<typeof updatePaymentMethod>[1]) => updatePaymentMethod(editing!.id, data),
    onSuccess: () => {
      toast({ title: "Forma de pagamento atualizada" })
      setOpen(false)
      setEditing(null)
      qc.invalidateQueries({ queryKey: ["canonical", "payment-methods"] })
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: () => {
      toast({ title: "Forma de pagamento excluída" })
      qc.invalidateQueries({ queryKey: ["canonical", "payment-methods"] })
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  })

  const items = pmQuery.data?.items ?? []
  const total = pmQuery.data?.total ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Formas de Pagamento</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
          <Button variant="outline" onClick={() => {
            const headers = ["externalId", "name", "enabled"]
            const rows: (string | number | null)[][] = [
              ["1", "Dinheiro", 1],
              ["2", "Cartão de Crédito", 1],
            ]
            downloadXlsx("modelo_formas_pagamento.xlsx", headers, rows, "FormasPagamento")
          }}>
            <Download className="w-4 h-4 mr-2" />
            Modelo XLSX
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline" onClick={() => {
            const headers = ["externalId", "name", "enabled"]
            const rows = items.map((pm) => [pm.externalId ?? null, pm.name, pm.enabled ? 1 : 0])
            downloadXlsx("formas_pagamento.xlsx", headers, rows, "FormasPagamento")
          }}>
            <Download className="w-4 h-4 mr-2" />
            Exportar XLSX
          </Button>
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Forma de Pagamento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pmQuery.isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4">Carregando...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4">Nenhum registro encontrado</TableCell></TableRow>
              ) : (
                items.map((pm) => (
                  <TableRow key={pm.id}>
                    <TableCell>{pm.externalId ?? "—"}</TableCell>
                    <TableCell>{pm.name}</TableCell>
                    <TableCell>{pm.enabled ? "Sim" : "Não"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(pm); setOpen(true) }}>
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
                              <AlertDialogTitle>Excluir forma de pagamento?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMut.mutate(pm.id)}>Excluir</AlertDialogAction>
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
        <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Total: {total}</div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Anterior</Button>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * take >= total}>Próxima</Button>
            </div>
        </div>
      </CardContent>
      <input
        ref={fileRef}
        hidden
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setImporting(true)
          try {
            const buf = await file.arrayBuffer()
            const wb = XLSX.read(buf, { type: "array" })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const rows: Array<{ externalId?: string | null; name?: string | null; enabled?: string | number | boolean | null }> = XLSX.utils.sheet_to_json(ws, { defval: null })
            const itemsToUpsert = []
            const errors: string[] = []
            for (let idx = 0; idx < rows.length; idx++) {
              const r = rows[idx]
              const rowIndex = idx + 2
              const nameValue = String(r.name ?? "").trim()
              if (!nameValue) { errors.push(`Linha ${rowIndex}: name obrigatório`); continue }
              const externalIdValue = String(r.externalId ?? "").trim() || null
              const rawEnabled = r.enabled
              const enabledValue = typeof rawEnabled === "boolean"
                ? rawEnabled
                : ["1", "true", "sim", "s", "y", "yes"].includes(String(rawEnabled ?? "").trim().toLowerCase())
              itemsToUpsert.push({ externalId: externalIdValue, name: nameValue, enabled: enabledValue })
            }
            if (itemsToUpsert.length) {
              const res = await upsertPaymentMethods(itemsToUpsert)
              toast({ title: "Importação concluída", description: `Criados: ${res.created} · Atualizados: ${res.updated}` })
              await qc.invalidateQueries({ queryKey: ["canonical", "payment-methods"] })
            }
            if (errors.length) {
              toast({ title: "Erros na importação", description: errors.slice(0, 8).join("\n"), variant: "destructive" })
            }
          } finally {
            setImporting(false)
            if (fileRef.current) fileRef.current.value = ""
          }
        }}
      />
      <PaymentMethodDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if(!v) setEditing(null) }}
        value={editing}
        loading={createMut.isPending || updateMut.isPending}
        onSubmit={async (val) => {
            if (editing) {
                await updateMut.mutateAsync(val)
            } else {
                await createMut.mutateAsync(val)
            }
        }}
      />
    </Card>
  )
}
