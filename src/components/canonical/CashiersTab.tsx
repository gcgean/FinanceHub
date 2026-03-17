import { useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listCashiers, upsertCashiers, updateCashier, deleteCashier, type Cashier } from "@/api/canonical"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { downloadXlsx } from "@/utils/xlsx"
import * as XLSX from "xlsx"
import { toast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export function CashiersTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [take, setTake] = useState(20)
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Cashier | null>(null)
  const [externalId, setExternalId] = useState("")
  const [name, setName] = useState("")
  const [active, setActive] = useState(true)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const cashiersQuery = useQuery({
    queryKey: ["canonical", "cashiers", { q: search, take, page }],
    queryFn: async () => listCashiers({ q: search, take, skip: page * take }),
  })

  const items = useMemo(() => cashiersQuery.data?.items ?? [], [cashiersQuery.data?.items])
  const total = cashiersQuery.data?.total ?? 0

  const openDialog = (cashier?: Cashier | null) => {
    if (cashier) {
      setEditing(cashier)
      setExternalId(cashier.externalId ?? "")
      setName(cashier.name ?? "")
      setActive(cashier.active)
    } else {
      setEditing(null)
      setExternalId("")
      setName("")
      setActive(true)
    }
    setOpen(true)
  }

  const saveCashier = async () => {
    const payload = {
      externalId: externalId.trim() || null,
      name: name.trim(),
      active,
    }
    if (!payload.name) {
      toast({ title: "Informe o nome do caixa", variant: "destructive" })
      return
    }
    if (editing) {
      await updateCashier(editing.id, payload)
      toast({ title: "Caixa atualizado" })
    } else {
      const res = await upsertCashiers(payload)
      toast({ title: "Caixa salvo", description: `Criados: ${res.created} · Atualizados: ${res.updated}` })
    }
    setOpen(false)
    setEditing(null)
    await qc.invalidateQueries({ queryKey: ["canonical", "cashiers"] })
  }

  const deleteMut = useMutation({
    mutationFn: deleteCashier,
    onSuccess: () => {
      toast({ title: "Caixa excluído" })
      qc.invalidateQueries({ queryKey: ["canonical", "cashiers"] })
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Caixas</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
          <Button variant="outline" onClick={() => {
            const headers = ["externalId", "name", "active"]
            const rows: (string | number | null)[][] = [
              ["1", "Caixa 01", 1],
              ["2", "Caixa 02", 1],
            ]
            downloadXlsx("modelo_caixas.xlsx", headers, rows, "Caixas")
          }}>
            <Download className="w-4 h-4 mr-2" />
            Modelo XLSX
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => openDialog(null)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo
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
              {cashiersQuery.isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4">Carregando...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4">Nenhum registro encontrado</TableCell></TableRow>
              ) : (
                items.map((cashier) => (
                  <TableRow key={cashier.id}>
                    <TableCell>{cashier.externalId ?? "—"}</TableCell>
                    <TableCell>{cashier.name}</TableCell>
                    <TableCell>{cashier.active ? "Sim" : "Não"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(cashier)}>
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
                              <AlertDialogTitle>Excluir caixa?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMut.mutate(cashier.id)}>Excluir</AlertDialogAction>
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
            const rows: Array<{ externalId?: string | null; name?: string | null; active?: string | number | boolean | null }> = XLSX.utils.sheet_to_json(ws, { defval: null })
            const itemsToUpsert = []
            const errors: string[] = []
            for (let idx = 0; idx < rows.length; idx++) {
              const r = rows[idx]
              const rowIndex = idx + 2
              const nameValue = String(r.name ?? "").trim()
              if (!nameValue) { errors.push(`Linha ${rowIndex}: name obrigatório`); continue }
              const externalIdValue = String(r.externalId ?? "").trim() || null
              const rawActive = r.active
              const activeValue = typeof rawActive === "boolean"
                ? rawActive
                : ["1", "true", "sim", "s", "y", "yes"].includes(String(rawActive ?? "").trim().toLowerCase())
              itemsToUpsert.push({ externalId: externalIdValue, name: nameValue, active: activeValue })
            }
            if (itemsToUpsert.length) {
              const res = await upsertCashiers(itemsToUpsert)
              toast({ title: "Importação de caixas concluída", description: `Criados: ${res.created} · Atualizados: ${res.updated}` })
              await qc.invalidateQueries({ queryKey: ["canonical", "cashiers"] })
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar caixa" : "Novo caixa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Código (ERP)" value={externalId} onChange={(e) => setExternalId(e.target.value)} />
            <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex items-center gap-2">
              <Checkbox checked={active} onCheckedChange={(v) => setActive(Boolean(v))} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={saveCashier}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
