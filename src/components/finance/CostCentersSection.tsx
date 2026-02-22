import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createCostCenter, listCostCenters, updateCostCenter, deleteCostCenter, type CostCenter } from "@/api/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2, Upload, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { CostCenterDialog } from "@/components/finance/CostCenterDialog"
import { useAuthStore } from "@/stores/authStore"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ApiResponseError } from "@/utils/api"
import * as XLSX from "xlsx"
import { downloadXlsx } from "@/utils/xlsx"
type ImportRow = { externalCode?: string | null; code?: string | null; description?: string | null; active?: number | boolean | null }

export function CostCentersSection() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CostCenter | null>(null)

  const costCenters = useQuery({
    queryKey: ["finance", "costCenters", { companyId }],
    queryFn: listCostCenters,
  })

  const createMut = useMutation({
    mutationFn: createCostCenter,
    onSuccess: async () => {
      toast({ title: "Centro de custo criado" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["finance", "costCenters"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<{ code: string; description: string; active: boolean }> }) => updateCostCenter(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Centro de custo atualizado" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["finance", "costCenters"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteCostCenter(id),
    onSuccess: async () => {
      toast({ title: "Centro excluído" })
      await qc.invalidateQueries({ queryKey: ["finance", "costCenters"] })
    },
    onError: (e: unknown) => {
      const code = e instanceof ApiResponseError ? e.code : undefined
      const msg =
        code === "CANNOT_DELETE_IN_USE"
          ? "Centro em uso em lançamentos"
          : e instanceof Error
          ? e.message
          : undefined
      toast({ title: "Erro ao excluir", description: msg, variant: "destructive" })
    },
  })

  const items = useMemo(() => {
    const list = costCenters.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => c.description.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
  }, [costCenters.data, search])

  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Centros de custo</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por descrição ou código..." className="w-72" />
          <Button variant="outline" onClick={() => {
            const headers = ["externalCode", "code", "description", "active"]
            const rows: (string | number | null)[][] = [
              ["CC-ADM", "ADM", "Administrativo", 1],
              ["CC-OFI", "OFI", "Oficina", 1],
            ]
            downloadXlsx("modelo_centros.xlsx", headers, rows, "Centros")
          }}>
            <Download className="w-4 h-4 mr-2" />
            Modelo XLSX
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
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costCenters.isLoading ? (
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.code}</TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true) }}>
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
                              <AlertDialogTitle>Excluir centro de custo?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => { await deleteMut.mutateAsync(c.id) }}>
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
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">Nenhum centro de custo encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <CostCenterDialog
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
          value={editing}
          loading={createMut.isPending || updateMut.isPending}
          onSubmit={async (data) => {
            const code = (data.code ?? "").trim()
            const desc = data.description?.trim()
            if (!desc) {
              toast({ title: "Informe a descrição", variant: "destructive" })
              return
            }
            if (editing) {
              await updateMut.mutateAsync({ id: editing.id, body: { ...data, description: desc, code: code ? code : undefined } })
            } else {
              await createMut.mutateAsync({ ...data, code: code ? code : undefined, description: desc })
            }
          }}
        />

        <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Importar centros de custo via Excel</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Use arquivo com colunas: externalCode, code, description, active. Se o externalCode existir, atualiza; senão, cria. Se code vier vazio, será gerado automaticamente.
              </div>
              <input
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
                    const rows: Array<ImportRow> = XLSX.utils.sheet_to_json(ws, { defval: null })
                    const byExt: Record<string, string> = {}
                    const byCode: Record<string, string> = {}
                    for (const c of (costCenters.data ?? [])) {
                      if (c.externalCode) byExt[c.externalCode] = c.id
                      byCode[c.code] = c.id
                    }
                    const parseActive = (v: unknown): boolean | undefined => {
                      if (v === null || v === undefined || v === "") return undefined
                      if (typeof v === "boolean") return v
                      const s = String(v).trim().toLowerCase()
                      if (s === "1" || s === "true") return true
                      if (s === "0" || s === "false") return false
                      return undefined
                    }
                    let created = 0, updated = 0, failed = 0
                    const errors: string[] = []
                    for (const r of rows) {
                      const externalCode = String(r.externalCode ?? "").trim() || null
                      const code = String(r.code ?? "").trim()
                      const description = r.description === null ? "" : String(r.description ?? "").trim()
                      const active = parseActive(r.active)
                      const rowIndex = rows.indexOf(r) + 2
                      try {
                        const id = externalCode ? byExt[externalCode] : (code ? byCode[code] : undefined)
                        if (id) {
                          const payload: Partial<{ code: string; description: string; active: boolean; externalCode: string | null }> = {}
                          if (description) payload.description = description
                          if (externalCode !== null) payload.externalCode = externalCode
                          if (active !== undefined) payload.active = active
                          if (Object.keys(payload).length === 0) {
                            failed++; errors.push(`Linha ${rowIndex}: nenhum campo para atualizar`)
                            continue
                          }
                          await updateMut.mutateAsync({ id, body: payload })
                          updated++
                        } else {
                          if (!description) {
                            failed++; errors.push(`Linha ${rowIndex}: descrição obrigatória para criar`)
                            continue
                          }
                          await createMut.mutateAsync({ description, externalCode, code: code || undefined, active })
                          created++
                        }
                      } catch (err) {
                        failed++
                        const msg = err instanceof Error ? err.message : "ERRO_DESCONHECIDO"
                        errors.push(`Linha ${rowIndex}: ${msg}`)
                      }
                    }
                    const detail = errors.length ? `\n${errors.slice(0, 8).join("\n")}${errors.length > 8 ? `\n(+${errors.length - 8} mais)` : ""}` : ""
                    toast({ title: "Importação concluída", description: `Criados: ${created} · Atualizados: ${updated} · Erros: ${failed}${detail}` })
                    setImportOpen(false)
                    await qc.invalidateQueries({ queryKey: ["finance", "costCenters"] })
                  } finally {
                    setImporting(false)
                  }
                }}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={importing}>Fechar</AlertDialogCancel>
              <AlertDialogAction disabled>Processar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
