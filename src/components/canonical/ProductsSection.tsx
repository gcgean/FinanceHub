import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductSections,
  createProductSection,
  updateProductSection,
  deleteProductSection,
  listProductGroups,
  createProductGroup,
  updateProductGroup,
  deleteProductGroup,
  listProductSubgroups,
  createProductSubgroup,
  updateProductSubgroup,
  deleteProductSubgroup,
  listProductManufacturers,
  createProductManufacturer,
  updateProductManufacturer,
  deleteProductManufacturer,
  type Product,
  type ProductSection,
  type ProductGroup,
  type ProductSubgroup,
  type ProductManufacturer,
} from "@/api/canonical"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2, Upload, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ProductDialog } from "@/components/canonical/ProductDialog"
import { useAuthStore } from "@/stores/authStore"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import * as XLSX from "xlsx"
import { downloadXlsx } from "@/utils/xlsx"
type ImportRow = { sku?: string | null; barcode?: string | null; name?: string | null; section?: string | null; group?: string | null; subgroup?: string | null; categoryPath?: string | null; brandName?: string | null; costPrice?: number | string | null; salePrice?: number | string | null; active?: number | boolean | string | null }
type SectionImportRow = { code?: string | null; name?: string | null }
type GroupImportRow = { sectionCode?: string | null; sectionName?: string | null; code?: string | null; name?: string | null }
type SubgroupImportRow = { sectionCode?: string | null; sectionName?: string | null; groupCode?: string | null; groupName?: string | null; code?: string | null; name?: string | null }
type ManufacturerImportRow = { code?: string | null; name?: string | null }

export function ProductsSection() {
  return (
    <Tabs defaultValue="products" className="space-y-4">
      <TabsList>
        <TabsTrigger value="products">Produtos</TabsTrigger>
        <TabsTrigger value="sections">Seções</TabsTrigger>
        <TabsTrigger value="groups">Grupos</TabsTrigger>
        <TabsTrigger value="subgroups">Subgrupos</TabsTrigger>
        <TabsTrigger value="manufacturers">Fabricantes</TabsTrigger>
      </TabsList>
      <TabsContent value="products">
        <ProductsTab />
      </TabsContent>
      <TabsContent value="sections">
        <ProductSectionsTab />
      </TabsContent>
      <TabsContent value="groups">
        <ProductGroupsTab />
      </TabsContent>
      <TabsContent value="subgroups">
        <ProductSubgroupsTab />
      </TabsContent>
      <TabsContent value="manufacturers">
        <ProductManufacturersTab />
      </TabsContent>
    </Tabs>
  )
}

function ProductsTab() {
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

function ProductSectionsTab() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [editing, setEditing] = useState<ProductSection | null>(null)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")

  const sections = useQuery({
    queryKey: ["canonical", "product-sections", { companyId }],
    queryFn: listProductSections,
  })

  const createMut = useMutation({
    mutationFn: createProductSection,
    onSuccess: async () => {
      toast({ title: "Seção criada" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "product-sections"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<{ code: string; name: string }> }) => updateProductSection(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Seção atualizada" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["canonical", "product-sections"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteProductSection(id),
    onSuccess: async () => {
      toast({ title: "Seção excluída" })
      await qc.invalidateQueries({ queryKey: ["canonical", "product-sections"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  useEffect(() => {
    if (open) {
      setCode(editing?.code ?? "")
      setName(editing?.name ?? "")
    }
  }, [open, editing])

  const items = useMemo(() => {
    const list = sections.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
  }, [sections.data, search])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Seções</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
          <Button variant="outline" onClick={() => {
            const headers = ["code", "name"]
            const rows: (string | number | null)[][] = [
              ["01", "Bebidas"],
              ["02", "Mercearia"],
            ]
            downloadXlsx("modelo_secoes.xlsx", headers, rows, "Seções")
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
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.isLoading ? (
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true) }}>
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
                              <AlertDialogTitle>Excluir seção?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => { await deleteMut.mutateAsync(s.id) }}>
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
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">Nenhuma seção encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Importar seções via Excel</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Colunas: code, name. Atualiza quando code ou name existir; senão, cria novo.
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
                    const rows: Array<SectionImportRow> = XLSX.utils.sheet_to_json(ws, { defval: null })
                    const byCode = new Map<string, ProductSection>()
                    const byName = new Map<string, ProductSection>()
                    for (const s of sections.data ?? []) {
                      if (s.code) byCode.set(s.code.toLowerCase(), s)
                      if (s.name) byName.set(s.name.toLowerCase(), s)
                    }
                    let created = 0, updated = 0, failed = 0
                    const errors: string[] = []
                    for (let idx = 0; idx < rows.length; idx++) {
                      const r = rows[idx]
                      const rowIndex = idx + 2
                      const rowCode = String(r.code ?? "").trim()
                      const rowName = String(r.name ?? "").trim()
                      if (!rowName) {
                        failed++; errors.push(`Linha ${rowIndex}: name obrigatório`)
                        continue
                      }
                      const existing =
                        (rowCode && byCode.get(rowCode.toLowerCase())) ||
                        byName.get(rowName.toLowerCase())
                      try {
                        await createMut.mutateAsync({ name: rowName, code: rowCode || undefined })
                        if (existing) updated++; else created++
                      } catch (err) {
                        failed++
                        const msg = err instanceof Error ? err.message : "ERRO_DESCONHECIDO"
                        errors.push(`Linha ${rowIndex}: ${msg}`)
                      }
                    }
                    const detail = errors.length ? `\n${errors.slice(0, 8).join("\n")}${errors.length > 8 ? `\n(+${errors.length - 8} mais)` : ""}` : ""
                    toast({ title: "Importação concluída", description: `Criados: ${created} · Atualizados: ${updated} · Erros: ${failed}${detail}` })
                    setImportOpen(false)
                    await qc.invalidateQueries({ queryKey: ["canonical", "product-sections"] })
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
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Seção" : "Nova Seção"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Código</div>
              <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Descrição</div>
              <Input placeholder="Descrição" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                const finalName = name.trim()
                if (!finalName) {
                  toast({ title: "Informe a descrição", variant: "destructive" })
                  return
                }
                const payload = { name: finalName, code: code.trim() || undefined }
                if (editing) {
                  await updateMut.mutateAsync({ id: editing.id, body: payload })
                } else {
                  await createMut.mutateAsync(payload)
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ProductGroupsTab() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [editing, setEditing] = useState<ProductGroup | null>(null)
  const [sectionId, setSectionId] = useState("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")

  const sections = useQuery({
    queryKey: ["canonical", "product-sections", { companyId }],
    queryFn: listProductSections,
  })
  const groups = useQuery({
    queryKey: ["canonical", "product-groups", { companyId }],
    queryFn: listProductGroups,
  })

  const sectionById = useMemo(() => {
    const map = new Map<string, ProductSection>()
    for (const s of sections.data ?? []) map.set(s.id, s)
    return map
  }, [sections.data])

  const createMut = useMutation({
    mutationFn: createProductGroup,
    onSuccess: async () => {
      toast({ title: "Grupo criado" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "product-groups"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<{ sectionId: string; code: string; name: string }> }) => updateProductGroup(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Grupo atualizado" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["canonical", "product-groups"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteProductGroup(id),
    onSuccess: async () => {
      toast({ title: "Grupo excluído" })
      await qc.invalidateQueries({ queryKey: ["canonical", "product-groups"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  useEffect(() => {
    if (open) {
      setCode(editing?.code ?? "")
      setName(editing?.name ?? "")
      const fallback = sections.data?.[0]?.id ?? ""
      setSectionId(editing?.sectionId ?? fallback)
    }
  }, [open, editing, sections.data])

  const items = useMemo(() => {
    const list = groups.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((g) => {
      const s = sectionById.get(g.sectionId)
      return g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q) || (s?.name.toLowerCase().includes(q) ?? false)
    })
  }, [groups.data, search, sectionById])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Grupos</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
          <Button variant="outline" onClick={() => {
            const headers = ["sectionCode", "sectionName", "code", "name"]
            const rows: (string | number | null)[][] = [
              ["01", "Bebidas", "0101", "Refrigerantes"],
              ["01", "Bebidas", "0102", "Sucos"],
            ]
            downloadXlsx("modelo_grupos.xlsx", headers, rows, "Grupos")
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
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Seção</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.isLoading ? (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.code}</TableCell>
                    <TableCell>{g.name}</TableCell>
                    <TableCell>{sectionById.get(g.sectionId)?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(g); setOpen(true) }}>
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
                              <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => { await deleteMut.mutateAsync(g.id) }}>
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
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Nenhum grupo encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Importar grupos via Excel</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Colunas: sectionCode, sectionName, code, name. Atualiza quando code ou name existir dentro da seção.
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
                    const rows: Array<GroupImportRow> = XLSX.utils.sheet_to_json(ws, { defval: null })
                    const sectionsByCode = new Map<string, ProductSection>()
                    const sectionsByName = new Map<string, ProductSection>()
                    for (const s of sections.data ?? []) {
                      if (s.code) sectionsByCode.set(s.code.toLowerCase(), s)
                      if (s.name) sectionsByName.set(s.name.toLowerCase(), s)
                    }
                    let created = 0, updated = 0, failed = 0
                    const errors: string[] = []
                    for (let idx = 0; idx < rows.length; idx++) {
                      const r = rows[idx]
                      const rowIndex = idx + 2
                      const rowSectionCode = String(r.sectionCode ?? "").trim()
                      const rowSectionName = String(r.sectionName ?? "").trim()
                      const rowCode = String(r.code ?? "").trim()
                      const rowName = String(r.name ?? "").trim()
                      const section =
                        (rowSectionCode && sectionsByCode.get(rowSectionCode.toLowerCase())) ||
                        (rowSectionName && sectionsByName.get(rowSectionName.toLowerCase()))
                      if (!section) {
                        failed++; errors.push(`Linha ${rowIndex}: seção não encontrada`)
                        continue
                      }
                      if (!rowName) {
                        failed++; errors.push(`Linha ${rowIndex}: name obrigatório`)
                        continue
                      }
                      const existing =
                        (rowCode && (groups.data ?? []).find((g) => g.sectionId === section.id && (g.code ?? "").toLowerCase() === rowCode.toLowerCase())) ||
                        (groups.data ?? []).find((g) => g.sectionId === section.id && g.name.toLowerCase() === rowName.toLowerCase())
                      try {
                        await createMut.mutateAsync({ sectionId: section.id, name: rowName, code: rowCode || undefined })
                        if (existing) updated++; else created++
                      } catch (err) {
                        failed++
                        const msg = err instanceof Error ? err.message : "ERRO_DESCONHECIDO"
                        errors.push(`Linha ${rowIndex}: ${msg}`)
                      }
                    }
                    const detail = errors.length ? `\n${errors.slice(0, 8).join("\n")}${errors.length > 8 ? `\n(+${errors.length - 8} mais)` : ""}` : ""
                    toast({ title: "Importação concluída", description: `Criados: ${created} · Atualizados: ${updated} · Erros: ${failed}${detail}` })
                    setImportOpen(false)
                    await qc.invalidateQueries({ queryKey: ["canonical", "product-groups"] })
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
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Seção</div>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a seção" />
                </SelectTrigger>
                <SelectContent>
                  {(sections.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Código</div>
              <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Grupo</div>
              <Input placeholder="Nome do grupo" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                const finalName = name.trim()
                if (!sectionId) {
                  toast({ title: "Selecione a seção", variant: "destructive" })
                  return
                }
                if (!finalName) {
                  toast({ title: "Informe o nome do grupo", variant: "destructive" })
                  return
                }
                const payload = { sectionId, name: finalName, code: code.trim() || undefined }
                if (editing) {
                  await updateMut.mutateAsync({ id: editing.id, body: payload })
                } else {
                  await createMut.mutateAsync(payload)
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ProductSubgroupsTab() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [editing, setEditing] = useState<ProductSubgroup | null>(null)
  const [groupId, setGroupId] = useState("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")

  const sections = useQuery({
    queryKey: ["canonical", "product-sections", { companyId }],
    queryFn: listProductSections,
  })
  const groups = useQuery({
    queryKey: ["canonical", "product-groups", { companyId }],
    queryFn: listProductGroups,
  })
  const subgroups = useQuery({
    queryKey: ["canonical", "product-subgroups", { companyId }],
    queryFn: listProductSubgroups,
  })

  const sectionById = useMemo(() => {
    const map = new Map<string, ProductSection>()
    for (const s of sections.data ?? []) map.set(s.id, s)
    return map
  }, [sections.data])
  const groupById = useMemo(() => {
    const map = new Map<string, ProductGroup>()
    for (const g of groups.data ?? []) map.set(g.id, g)
    return map
  }, [groups.data])

  const createMut = useMutation({
    mutationFn: createProductSubgroup,
    onSuccess: async () => {
      toast({ title: "Subgrupo criado" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "product-subgroups"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<{ groupId: string; code: string; name: string }> }) => updateProductSubgroup(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Subgrupo atualizado" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["canonical", "product-subgroups"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteProductSubgroup(id),
    onSuccess: async () => {
      toast({ title: "Subgrupo excluído" })
      await qc.invalidateQueries({ queryKey: ["canonical", "product-subgroups"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  useEffect(() => {
    if (open) {
      setCode(editing?.code ?? "")
      setName(editing?.name ?? "")
      const fallback = groups.data?.[0]?.id ?? ""
      setGroupId(editing?.groupId ?? fallback)
    }
  }, [open, editing, groups.data])

  const items = useMemo(() => {
    const list = subgroups.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((sg) => {
      const g = groupById.get(sg.groupId)
      const s = g ? sectionById.get(g.sectionId) : undefined
      return sg.name.toLowerCase().includes(q) || sg.code.toLowerCase().includes(q) || (g?.name.toLowerCase().includes(q) ?? false) || (s?.name.toLowerCase().includes(q) ?? false)
    })
  }, [subgroups.data, search, groupById, sectionById])

  const groupOptions = useMemo(() => {
    return (groups.data ?? []).map((g) => {
      const s = sectionById.get(g.sectionId)
      const label = s ? `${s.name} / ${g.name}` : g.name
      return { id: g.id, label }
    })
  }, [groups.data, sectionById])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Subgrupos</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
          <Button variant="outline" onClick={() => {
            const headers = ["sectionCode", "sectionName", "groupCode", "groupName", "code", "name"]
            const rows: (string | number | null)[][] = [
              ["01", "Bebidas", "0101", "Refrigerantes", "010101", "Cola"],
              ["01", "Bebidas", "0102", "Sucos", "010201", "Suco de Uva"],
            ]
            downloadXlsx("modelo_subgrupos.xlsx", headers, rows, "Subgrupos")
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
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Subgrupo</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subgroups.isLoading ? (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((sg) => {
                  const g = groupById.get(sg.groupId)
                  const s = g ? sectionById.get(g.sectionId) : undefined
                  const groupLabel = g ? (s ? `${s.name} / ${g.name}` : g.name) : "—"
                  return (
                    <TableRow key={sg.id}>
                      <TableCell className="font-medium">{sg.code}</TableCell>
                      <TableCell>{sg.name}</TableCell>
                      <TableCell>{groupLabel}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(sg); setOpen(true) }}>
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
                                <AlertDialogTitle>Excluir subgrupo?</AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => { await deleteMut.mutateAsync(sg.id) }}>
                                  Excluir
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
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Nenhum subgrupo encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Importar subgrupos via Excel</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Colunas: sectionCode, sectionName, groupCode, groupName, code, name. Use section para eliminar ambiguidades.
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
                    const rows: Array<SubgroupImportRow> = XLSX.utils.sheet_to_json(ws, { defval: null })
                    const sectionsByCode = new Map<string, ProductSection>()
                    const sectionsByName = new Map<string, ProductSection>()
                    for (const s of sections.data ?? []) {
                      if (s.code) sectionsByCode.set(s.code.toLowerCase(), s)
                      if (s.name) sectionsByName.set(s.name.toLowerCase(), s)
                    }
                    let created = 0, updated = 0, failed = 0
                    const errors: string[] = []
                    for (let idx = 0; idx < rows.length; idx++) {
                      const r = rows[idx]
                      const rowIndex = idx + 2
                      const rowSectionCode = String(r.sectionCode ?? "").trim()
                      const rowSectionName = String(r.sectionName ?? "").trim()
                      const rowGroupCode = String(r.groupCode ?? "").trim()
                      const rowGroupName = String(r.groupName ?? "").trim()
                      const rowCode = String(r.code ?? "").trim()
                      const rowName = String(r.name ?? "").trim()
                      const section =
                        (rowSectionCode && sectionsByCode.get(rowSectionCode.toLowerCase())) ||
                        (rowSectionName && sectionsByName.get(rowSectionName.toLowerCase()))
                      const groupCandidates = (groups.data ?? []).filter((g) => {
                        if (section && g.sectionId !== section.id) return false
                        if (rowGroupCode && (g.code ?? "").toLowerCase() === rowGroupCode.toLowerCase()) return true
                        if (rowGroupName && g.name.toLowerCase() === rowGroupName.toLowerCase()) return true
                        return false
                      })
                      if (groupCandidates.length > 1) {
                        failed++; errors.push(`Linha ${rowIndex}: grupo ambíguo`)
                        continue
                      }
                      const group = groupCandidates[0]
                      if (!group) {
                        failed++; errors.push(`Linha ${rowIndex}: grupo não encontrado`)
                        continue
                      }
                      if (!rowName) {
                        failed++; errors.push(`Linha ${rowIndex}: name obrigatório`)
                        continue
                      }
                      const existing =
                        (rowCode && (subgroups.data ?? []).find((sg) => sg.groupId === group.id && (sg.code ?? "").toLowerCase() === rowCode.toLowerCase())) ||
                        (subgroups.data ?? []).find((sg) => sg.groupId === group.id && sg.name.toLowerCase() === rowName.toLowerCase())
                      try {
                        await createMut.mutateAsync({ groupId: group.id, name: rowName, code: rowCode || undefined })
                        if (existing) updated++; else created++
                      } catch (err) {
                        failed++
                        const msg = err instanceof Error ? err.message : "ERRO_DESCONHECIDO"
                        errors.push(`Linha ${rowIndex}: ${msg}`)
                      }
                    }
                    const detail = errors.length ? `\n${errors.slice(0, 8).join("\n")}${errors.length > 8 ? `\n(+${errors.length - 8} mais)` : ""}` : ""
                    toast({ title: "Importação concluída", description: `Criados: ${created} · Atualizados: ${updated} · Erros: ${failed}${detail}` })
                    setImportOpen(false)
                    await qc.invalidateQueries({ queryKey: ["canonical", "product-subgroups"] })
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
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Subgrupo" : "Novo Subgrupo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Grupo</div>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groupOptions.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Código</div>
              <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Subgrupo</div>
              <Input placeholder="Nome do subgrupo" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                const finalName = name.trim()
                if (!groupId) {
                  toast({ title: "Selecione o grupo", variant: "destructive" })
                  return
                }
                if (!finalName) {
                  toast({ title: "Informe o nome do subgrupo", variant: "destructive" })
                  return
                }
                const payload = { groupId, name: finalName, code: code.trim() || undefined }
                if (editing) {
                  await updateMut.mutateAsync({ id: editing.id, body: payload })
                } else {
                  await createMut.mutateAsync(payload)
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ProductManufacturersTab() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [editing, setEditing] = useState<ProductManufacturer | null>(null)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")

  const manufacturers = useQuery({
    queryKey: ["canonical", "product-manufacturers", { companyId }],
    queryFn: listProductManufacturers,
  })

  const createMut = useMutation({
    mutationFn: createProductManufacturer,
    onSuccess: async () => {
      toast({ title: "Fabricante criado" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "product-manufacturers"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<{ code: string; name: string }> }) => updateProductManufacturer(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Fabricante atualizado" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["canonical", "product-manufacturers"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteProductManufacturer(id),
    onSuccess: async () => {
      toast({ title: "Fabricante excluído" })
      await qc.invalidateQueries({ queryKey: ["canonical", "product-manufacturers"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  useEffect(() => {
    if (open) {
      setCode(editing?.code ?? "")
      setName(editing?.name ?? "")
    }
  }, [open, editing])

  const items = useMemo(() => {
    const list = manufacturers.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q))
  }, [manufacturers.data, search])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Fabricantes</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
          <Button variant="outline" onClick={() => {
            const headers = ["code", "name"]
            const rows: (string | number | null)[][] = [
              ["F001", "Coca-Cola"],
              ["F002", "Ambev"],
            ]
            downloadXlsx("modelo_fabricantes.xlsx", headers, rows, "Fabricantes")
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
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manufacturers.isLoading ? (
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.code}</TableCell>
                    <TableCell>{m.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setOpen(true) }}>
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
                              <AlertDialogTitle>Excluir fabricante?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => { await deleteMut.mutateAsync(m.id) }}>
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
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">Nenhum fabricante encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Importar fabricantes via Excel</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Colunas: code, name. Atualiza quando code ou name existir.
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
                    const rows: Array<ManufacturerImportRow> = XLSX.utils.sheet_to_json(ws, { defval: null })
                    const byCode = new Map<string, ProductManufacturer>()
                    const byName = new Map<string, ProductManufacturer>()
                    for (const m of manufacturers.data ?? []) {
                      if (m.code) byCode.set(m.code.toLowerCase(), m)
                      if (m.name) byName.set(m.name.toLowerCase(), m)
                    }
                    let created = 0, updated = 0, failed = 0
                    const errors: string[] = []
                    for (let idx = 0; idx < rows.length; idx++) {
                      const r = rows[idx]
                      const rowIndex = idx + 2
                      const rowCode = String(r.code ?? "").trim()
                      const rowName = String(r.name ?? "").trim()
                      if (!rowName) {
                        failed++; errors.push(`Linha ${rowIndex}: name obrigatório`)
                        continue
                      }
                      const existing =
                        (rowCode && byCode.get(rowCode.toLowerCase())) ||
                        byName.get(rowName.toLowerCase())
                      try {
                        await createMut.mutateAsync({ name: rowName, code: rowCode || undefined })
                        if (existing) updated++; else created++
                      } catch (err) {
                        failed++
                        const msg = err instanceof Error ? err.message : "ERRO_DESCONHECIDO"
                        errors.push(`Linha ${rowIndex}: ${msg}`)
                      }
                    }
                    const detail = errors.length ? `\n${errors.slice(0, 8).join("\n")}${errors.length > 8 ? `\n(+${errors.length - 8} mais)` : ""}` : ""
                    toast({ title: "Importação concluída", description: `Criados: ${created} · Atualizados: ${updated} · Erros: ${failed}${detail}` })
                    setImportOpen(false)
                    await qc.invalidateQueries({ queryKey: ["canonical", "product-manufacturers"] })
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
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Fabricante" : "Novo Fabricante"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Código</div>
              <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Nome</div>
              <Input placeholder="Nome do fabricante" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                const finalName = name.trim()
                if (!finalName) {
                  toast({ title: "Informe o nome do fabricante", variant: "destructive" })
                  return
                }
                const payload = { name: finalName, code: code.trim() || undefined }
                if (editing) {
                  await updateMut.mutateAsync({ id: editing.id, body: payload })
                } else {
                  await createMut.mutateAsync(payload)
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
