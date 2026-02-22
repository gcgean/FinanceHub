import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listProducts, createProduct, updateProduct, deleteProduct, type Product } from "@/api/canonical"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2, Upload, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ProductDialog } from "@/components/canonical/ProductDialog"
import { useAuthStore } from "@/stores/authStore"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import * as XLSX from "xlsx"
import { downloadXlsx } from "@/utils/xlsx"
type ImportRow = { sku?: string | null; barcode?: string | null; name?: string | null; section?: string | null; group?: string | null; subgroup?: string | null; categoryPath?: string | null; brandName?: string | null; costPrice?: number | string | null; salePrice?: number | string | null; active?: number | boolean | string | null }

export function ProductsSection() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Product | null>(null)
  const [open, setOpen] = useState(false)

  const [take, setTake] = useState(20)
  const [page, setPage] = useState(0)
  const products = useQuery<{ items: Product[]; total: number; take: number; skip: number }>({
    queryKey: ["canonical", "products", { companyId, q: search, take, page }],
    queryFn: async () => listProducts({ q: search, take, skip: page * take }),
  })

  const createMut = useMutation({
    mutationFn: async (payload: Parameters<typeof createProduct>[0]) => createProduct(payload),
    onSuccess: async () => {
      toast({ title: "Produto criado" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "products"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: async (payload: Parameters<typeof updateProduct>[1]) => updateProduct(editing!.id, payload),
    onSuccess: async () => {
      toast({ title: "Produto atualizado" })
      setEditing(null); setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "products"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteProduct(id),
    onSuccess: async () => {
      toast({ title: "Produto excluído" })
      await qc.invalidateQueries({ queryKey: ["canonical", "products"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const items = useMemo(() => products.data?.items ?? [], [products.data?.items])
  const total = products.data?.total ?? 0
  const isBusy = products.isLoading || products.isFetching
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Produtos</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
          <Button variant="outline" onClick={() => {
            const headers = ["sku", "barcode", "name", "section", "group", "subgroup", "brandName", "costPrice", "salePrice", "active"]
            const rows: (string | number | null)[][] = [
              ["SKU-001", "7891234567890", "Produto A", "Bebidas", "Refrigerantes", "Cola", "Marca X", 10, 15, 1],
              ["SKU-002", "", "Produto B", null, null, null, "", null, null, 1],
            ]
            downloadXlsx("modelo_produtos.xlsx", headers, rows, "Produtos")
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
      <CardContent className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Seção/Grupo/Subgrupo</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isBusy ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.code}</TableCell>
                    <TableCell>{a.sku ?? "—"}</TableCell>
                    <TableCell>{a.barcode ?? "—"}</TableCell>
                    <TableCell>{[a.section, a.group, a.subgroup].filter(Boolean).join(" / ") || "—"}</TableCell>
                    <TableCell>{a.brandName ?? "—"}</TableCell>
                    <TableCell>
                      {(() => {
                        const c = a.costPrice ?? null
                        const s = a.salePrice ?? null
                        if (c == null || s == null) return "—"
                        const mv = s - c
                        const mp = s > 0 ? (mv / s) * 100 : 0
                        const v = mv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        return `${v} (${mp.toFixed(2)}%)`
                      })()}
                    </TableCell>
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
                              <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
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
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ProductDialog
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
          value={editing}
          loading={createMut.isPending || updateMut.isPending}
          onSubmit={async (values) => {
            const name = values.name?.trim()
            if (!name) {
              toast({ title: "Informe o nome do produto", variant: "destructive" })
              return
            }
            if (editing) {
              await updateMut.mutateAsync({ ...values, name, code: values.code ? values.code : undefined })
            } else {
              await createMut.mutateAsync({ ...values, name, code: values.code ? values.code : undefined })
            }
          }}
        />
        <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Importar produtos via Excel</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Atualiza por SKU ou barcode quando já existentes; senão, cria. Código interno é gerado automaticamente.
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
                    const bySku: Record<string, Product> = {}
                    const byBc: Record<string, Product> = {}
                    for (const p of (products.data?.items ?? [])) {
                      if (p.sku) bySku[p.sku] = p
                      if (p.barcode) byBc[p.barcode] = p
                    }
                    const parseBool = (v: unknown): boolean | undefined => {
                      if (v === null || v === undefined || v === "") return undefined
                      if (typeof v === "boolean") return v
                      const s = String(v).trim().toLowerCase()
                      if (s === "1" || s === "true") return true
                      if (s === "0" || s === "false") return false
                      return undefined
                    }
                    const parseNumber = (v: unknown): number | undefined => {
                      if (v === null || v === undefined || v === "") return undefined
                      const n = Number(v)
                      return Number.isFinite(n) ? n : undefined
                    }
                    let created = 0, updated = 0, failed = 0
                    const errors: string[] = []
                    for (const r of rows) {
                      const rowIndex = rows.indexOf(r) + 2
                      const sku = String(r.sku ?? "").trim()
                      const barcode = String(r.barcode ?? "").trim()
                      const name = r.name === null ? "" : String(r.name ?? "").trim()
                      const section = String(r.section ?? "").trim() || null
                      const group = String(r.group ?? "").trim() || null
                      const subgroup = String(r.subgroup ?? "").trim() || null
                      let s = section, g = group, sg = subgroup
                      const categoryPath = String(r.categoryPath ?? "").trim() || null
                      if (!s && !g && !sg && categoryPath) {
                        const parts = categoryPath.split("/").map((x) => x.trim()).filter(Boolean)
                        s = parts[0] ?? null; g = parts[1] ?? null; sg = parts[2] ?? null
                      }
                      const brandName = String(r.brandName ?? "").trim() || null
                      const costPrice = parseNumber(r.costPrice)
                      const salePrice = parseNumber(r.salePrice)
                      const active = parseBool(r.active)
                      try {
                        const existing = (sku && bySku[sku]) || (barcode && byBc[barcode]) || undefined
                        if (existing) {
                          const body: Partial<Product> = {}
                          if (name) body.name = name
                          if (sku) body.sku = sku
                          if (barcode) body.barcode = barcode
                          if (s !== null) body.section = s
                          if (g !== null) body.group = g
                          if (sg !== null) body.subgroup = sg
                          if (brandName !== null) body.brandName = brandName
                          if (costPrice !== undefined) body.costPrice = costPrice
                          if (salePrice !== undefined) body.salePrice = salePrice
                          if (active !== undefined) body.active = active
                          if (!Object.keys(body).length) {
                            failed++; errors.push(`Linha ${rowIndex}: nenhum campo para atualizar`)
                            continue
                          }
                          await updateMut.mutateAsync(body)
                          updated++
                        } else {
                          if (!name) {
                            failed++; errors.push(`Linha ${rowIndex}: name obrigatório para criar`)
                            continue
                          }
                          const payload: Parameters<typeof createProduct>[0] = {
                            name,
                            sku: sku || undefined,
                            barcode: barcode || undefined,
                            section: s,
                            group: g,
                            subgroup: sg,
                            brandName,
                            costPrice,
                            salePrice,
                            active: active ?? true,
                          }
                          await createMut.mutateAsync(payload)
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
                    await qc.invalidateQueries({ queryKey: ["canonical", "products"] })
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
