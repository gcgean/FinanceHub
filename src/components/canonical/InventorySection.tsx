import { useQuery, useQueryClient } from "@tanstack/react-query"
import { listInventory, listInventoryLocations, updateInventoryLocation, upsertInventory, upsertInventoryLocations, type InventoryItem, type InventoryLocation } from "@/api/canonical"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useState, useMemo, useRef } from "react"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import { Download, Pencil, Plus, Upload } from "lucide-react"
import { downloadXlsx } from "@/utils/xlsx"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function InventorySection() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const [locationName, setLocationName] = useState("")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [importing, setImporting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createExternalProductId, setCreateExternalProductId] = useState("")
  const [createExternalLocationId, setCreateExternalLocationId] = useState("")
  const [createLocationName, setCreateLocationName] = useState("")
  const [createQtyOnHand, setCreateQtyOnHand] = useState<number | string>("")
  const [createUpdatedAt, setCreateUpdatedAt] = useState<string>("")
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [adjustQtyOnHand, setAdjustQtyOnHand] = useState<number | string>("")
  const [adjustUpdatedAt, setAdjustUpdatedAt] = useState<string>("")
  const [locationSearch, setLocationSearch] = useState("")
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<InventoryLocation | null>(null)
  const [locationExternalId, setLocationExternalId] = useState("")
  const [locationNameValue, setLocationNameValue] = useState("")
  const [locationHashTable, setLocationHashTable] = useState("")
  const [locationUpdatedAt, setLocationUpdatedAt] = useState("")
  const [locationIgnoreCons, setLocationIgnoreCons] = useState(false)
  const [locationImporting, setLocationImporting] = useState(false)
  const inventoryFileRef = useRef<HTMLInputElement | null>(null)
  const locationFileRef = useRef<HTMLInputElement | null>(null)
  const inv = useQuery({
    queryKey: ["canonical", "inventory", { companyId, q: search, locationName, dateRange }],
    queryFn: () =>
      listInventory({
        q: search,
        locationName: locationName || undefined,
        dateFrom: dateRange.from ? dateRange.from.toISOString() : undefined,
        dateTo: dateRange.to ? dateRange.to.toISOString() : undefined,
      }),
  })
  const items = useMemo(() => inv.data?.items ?? [], [inv.data?.items])
  const locationsQuery = useQuery({
    queryKey: ["canonical", "inventory-locations", { companyId, q: locationSearch }],
    queryFn: () => listInventoryLocations({ q: locationSearch || undefined }),
  })
  const locations = useMemo(() => locationsQuery.data?.items ?? [], [locationsQuery.data?.items])
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estoque</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="items" className="w-full">
          <TabsList>
            <TabsTrigger value="items">Lançamentos</TabsTrigger>
            <TabsTrigger value="locations">Locais</TabsTrigger>
          </TabsList>
          <TabsContent value="items" className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por produto (ERP)..." className="w-full md:w-64" />
                <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Local..." className="w-full md:w-48" />
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => {
                  const headers = ["externalProductId", "externalLocationId", "locationName", "qtyOnHand", "updatedAtSource"]
                  const rows: (string | number | null)[][] = [
                    ["EXT-PROD-001", "LOC-01", "Depósito Central", 10, "2026-02-10T12:00:00"],
                    ["EXT-PROD-002", "", "Loja 1", 5, ""],
                  ]
                  downloadXlsx("modelo_estoque.xlsx", headers, rows, "Estoque")
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Modelo XLSX
                </Button>
                <Button variant="outline" onClick={() => inventoryFileRef.current?.click()} disabled={importing}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </Button>
                <Button variant="outline" onClick={() => {
                  const headers = ["externalProductId", "externalLocationId", "locationName", "qtyOnHand", "updatedAtSource"]
                  const rows = items.map(i => [i.externalProductId, i.externalLocationId, i.locationName, i.qtyOnHand, i.updatedAtSource])
                  downloadXlsx("estoque.xlsx", headers, rows, "Estoque")
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar XLSX
                </Button>
                <Button onClick={() => {
                  setCreateExternalProductId("")
                  setCreateExternalLocationId("")
                  setCreateLocationName("")
                  setCreateQtyOnHand("")
                  setCreateUpdatedAt("")
                  setCreateOpen(true)
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar lançamento
                </Button>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto (ERP)</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead className="w-36">Quantidade</TableHead>
                    <TableHead className="w-40">Atualizado em</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inv.isLoading ? (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : items.length ? (
                    items.map((i: InventoryItem) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">
                          {i.externalProductId}
                          {i.productName ? ` — ${i.productName}` : ""}
                        </TableCell>
                        <TableCell>{i.locationName ?? i.externalLocationId ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{i.qtyOnHand}</TableCell>
                        <TableCell>{i.updatedAtSource ? new Date(i.updatedAtSource).toLocaleString("pt-BR") : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" onClick={() => {
                            setAdjustItem(i)
                            setAdjustQtyOnHand(i.qtyOnHand)
                            setAdjustUpdatedAt(i.updatedAtSource ? new Date(i.updatedAtSource).toISOString().slice(0, 16) : "")
                            setAdjustOpen(true)
                          }}>
                            Ajustar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Nenhum item encontrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <input
              ref={inventoryFileRef}
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
                  const rows: Array<{ externalProductId?: string | null; externalLocationId?: string | null; locationName?: string | null; qtyOnHand?: number | string | null; updatedAtSource?: string | null }> = XLSX.utils.sheet_to_json(ws, { defval: null })
                  const itemsToUpsert = []
                  const errors: string[] = []
                  for (let idx = 0; idx < rows.length; idx++) {
                    const r = rows[idx]
                    const rowIndex = idx + 2
                    const externalProductId = String(r.externalProductId ?? "").trim()
                    if (!externalProductId) { errors.push(`Linha ${rowIndex}: externalProductId obrigatório`); continue }
                    const externalLocationId = String(r.externalLocationId ?? "").trim() || null
                    const locationNameValue = String(r.locationName ?? "").trim() || null
                    const qty = Number(r.qtyOnHand)
                    if (!Number.isFinite(qty)) { errors.push(`Linha ${rowIndex}: qtyOnHand inválido`); continue }
                    const updatedAtSource = String(r.updatedAtSource ?? "").trim() || null
                    itemsToUpsert.push({ externalProductId, externalLocationId, locationName: locationNameValue, qtyOnHand: qty, updatedAtSource })
                  }
                  if (itemsToUpsert.length) {
                    const res = await upsertInventory(itemsToUpsert)
                    toast({ title: "Importação de estoque concluída", description: `Criados: ${res.created} · Atualizados: ${res.updated}` })
                    await qc.invalidateQueries({ queryKey: ["canonical", "inventory"] })
                  }
                  if (errors.length) {
                    toast({ title: "Erros na importação", description: errors.slice(0, 8).join("\n"), variant: "destructive" })
                  }
                } finally {
                  setImporting(false)
                  if (inventoryFileRef.current) inventoryFileRef.current.value = ""
                }
              }}
            />
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar lançamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Código produto ERP" value={createExternalProductId} onChange={(e) => setCreateExternalProductId(e.target.value)} />
                  <Input placeholder="Local externo" value={createExternalLocationId} onChange={(e) => setCreateExternalLocationId(e.target.value)} />
                  <Input placeholder="Nome do local" value={createLocationName} onChange={(e) => setCreateLocationName(e.target.value)} />
                  <Input placeholder="Quantidade" type="number" value={createQtyOnHand} onChange={(e) => setCreateQtyOnHand(e.target.value)} />
                  <Input placeholder="Atualizado em" type="datetime-local" value={createUpdatedAt} onChange={(e) => setCreateUpdatedAt(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={async () => {
                    const externalProductId = createExternalProductId.trim()
                    if (!externalProductId) { toast({ title: "Informe o código ERP do produto", variant: "destructive" }); return }
                    const qty = Number(createQtyOnHand)
                    if (!Number.isFinite(qty)) { toast({ title: "Quantidade inválida", variant: "destructive" }); return }
                    const payload = {
                      externalProductId,
                      externalLocationId: createExternalLocationId.trim() || null,
                      locationName: createLocationName.trim() || null,
                      qtyOnHand: qty,
                      updatedAtSource: createUpdatedAt ? new Date(createUpdatedAt).toISOString() : null,
                    }
                    const res = await upsertInventory(payload)
                    toast({ title: "Lançamento criado", description: `Criados: ${res.created} · Atualizados: ${res.updated}` })
                    setCreateOpen(false)
                    await qc.invalidateQueries({ queryKey: ["canonical", "inventory"] })
                  }}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajuste de estoque</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input disabled value={adjustItem?.externalProductId ?? ""} />
                  <Input disabled value={adjustItem?.externalLocationId ?? ""} />
                  <Input disabled value={adjustItem?.locationName ?? ""} />
                  <Input placeholder="Quantidade" type="number" value={adjustQtyOnHand} onChange={(e) => setAdjustQtyOnHand(e.target.value)} />
                  <Input placeholder="Atualizado em" type="datetime-local" value={adjustUpdatedAt} onChange={(e) => setAdjustUpdatedAt(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
                  <Button onClick={async () => {
                    if (!adjustItem) { setAdjustOpen(false); return }
                    const qty = Number(adjustQtyOnHand)
                    if (!Number.isFinite(qty)) { toast({ title: "Quantidade inválida", variant: "destructive" }); return }
                    const payload = {
                      externalProductId: adjustItem.externalProductId,
                      externalLocationId: adjustItem.externalLocationId ?? null,
                      locationName: adjustItem.locationName ?? null,
                      qtyOnHand: qty,
                      updatedAtSource: adjustUpdatedAt ? new Date(adjustUpdatedAt).toISOString() : null,
                    }
                    const res = await upsertInventory(payload)
                    toast({ title: "Estoque ajustado", description: `Criados: ${res.created} · Atualizados: ${res.updated}` })
                    setAdjustOpen(false)
                    await qc.invalidateQueries({ queryKey: ["canonical", "inventory"] })
                  }}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
          <TabsContent value="locations" className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <Input value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)} placeholder="Buscar por local..." className="w-full md:w-72" />
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => {
                  const headers = ["externalId", "name", "hashTable", "updatedAtSource", "ignoreConsolidation"]
                  const rows: (string | number | null)[][] = [
                    ["LOC-01", "Depósito Central", "", "2026-02-10T12:00:00", 0],
                    ["LOC-02", "Loja 1", "", "", 1],
                  ]
                  downloadXlsx("modelo_locais_estoque.xlsx", headers, rows, "Locais")
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Modelo XLSX
                </Button>
                <Button variant="outline" onClick={() => locationFileRef.current?.click()} disabled={locationImporting}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </Button>
                <Button onClick={() => {
                  setEditingLocation(null)
                  setLocationExternalId("")
                  setLocationNameValue("")
                  setLocationHashTable("")
                  setLocationUpdatedAt("")
                  setLocationIgnoreCons(false)
                  setLocationDialogOpen(true)
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo local
                </Button>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead className="w-40">Atualizado em</TableHead>
                    <TableHead className="w-40">Não contabiliza</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationsQuery.isLoading ? (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : locations.length ? (
                    locations.map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell className="font-medium">{loc.externalId ?? "—"}</TableCell>
                        <TableCell>{loc.name}</TableCell>
                        <TableCell>{loc.hashTable ?? "—"}</TableCell>
                        <TableCell>{loc.updatedAtSource ? new Date(loc.updatedAtSource).toLocaleString("pt-BR") : "—"}</TableCell>
                        <TableCell>{loc.ignoreConsolidation ? "Sim" : "Não"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" onClick={() => {
                            setEditingLocation(loc)
                            setLocationExternalId(loc.externalId ?? "")
                            setLocationNameValue(loc.name ?? "")
                            setLocationHashTable(loc.hashTable ?? "")
                            setLocationUpdatedAt(loc.updatedAtSource ? new Date(loc.updatedAtSource).toISOString().slice(0, 16) : "")
                            setLocationIgnoreCons(Boolean(loc.ignoreConsolidation))
                            setLocationDialogOpen(true)
                          }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Nenhum local encontrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <input
              ref={locationFileRef}
              hidden
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setLocationImporting(true)
                try {
                  const buf = await file.arrayBuffer()
                  const wb = XLSX.read(buf, { type: "array" })
                  const ws = wb.Sheets[wb.SheetNames[0]]
                  const rows: Array<{ externalId?: string | null; name?: string | null; hashTable?: string | null; updatedAtSource?: string | null; ignoreConsolidation?: string | number | boolean | null }> = XLSX.utils.sheet_to_json(ws, { defval: null })
                  const itemsToUpsert = []
                  const errors: string[] = []
                  for (let idx = 0; idx < rows.length; idx++) {
                    const r = rows[idx]
                    const rowIndex = idx + 2
                    const name = String(r.name ?? "").trim()
                    if (!name) { errors.push(`Linha ${rowIndex}: name obrigatório`); continue }
                    const externalId = String(r.externalId ?? "").trim() || null
                    const hashTable = String(r.hashTable ?? "").trim() || null
                    const updatedAtSource = String(r.updatedAtSource ?? "").trim() || null
                    const rawIgnore = r.ignoreConsolidation
                    const ignoreConsolidation = typeof rawIgnore === "boolean"
                      ? rawIgnore
                      : ["1", "true", "sim", "s", "y", "yes"].includes(String(rawIgnore ?? "").trim().toLowerCase())
                    itemsToUpsert.push({ externalId, name, hashTable, updatedAtSource, ignoreConsolidation })
                  }
                  if (itemsToUpsert.length) {
                    const res = await upsertInventoryLocations(itemsToUpsert)
                    toast({ title: "Importação de locais concluída", description: `Criados: ${res.created} · Atualizados: ${res.updated}` })
                    await qc.invalidateQueries({ queryKey: ["canonical", "inventory-locations"] })
                  }
                  if (errors.length) {
                    toast({ title: "Erros na importação", description: errors.slice(0, 8).join("\n"), variant: "destructive" })
                  }
                } finally {
                  setLocationImporting(false)
                  if (locationFileRef.current) locationFileRef.current.value = ""
                }
              }}
            />
            <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingLocation ? "Editar local" : "Novo local"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Código (ERP)" value={locationExternalId} onChange={(e) => setLocationExternalId(e.target.value)} />
                  <Input placeholder="Descrição" value={locationNameValue} onChange={(e) => setLocationNameValue(e.target.value)} />
                  <Input placeholder="Hash da tabela" value={locationHashTable} onChange={(e) => setLocationHashTable(e.target.value)} />
                  <Input placeholder="Atualizado em" type="datetime-local" value={locationUpdatedAt} onChange={(e) => setLocationUpdatedAt(e.target.value)} />
                  <div className="flex items-center gap-2">
                    <Checkbox checked={locationIgnoreCons} onCheckedChange={(v) => setLocationIgnoreCons(Boolean(v))} />
                    <Label>Não contabiliza consolidação</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={async () => {
                    const name = locationNameValue.trim()
                    if (!name) { toast({ title: "Informe a descrição do local", variant: "destructive" }); return }
                    const payload = {
                      externalId: locationExternalId.trim() || null,
                      name,
                      hashTable: locationHashTable.trim() || null,
                      updatedAtSource: locationUpdatedAt ? new Date(locationUpdatedAt).toISOString() : null,
                      ignoreConsolidation: locationIgnoreCons,
                    }
                    if (editingLocation) {
                      await updateInventoryLocation(editingLocation.id, payload)
                      toast({ title: "Local atualizado" })
                    } else {
                      const res = await upsertInventoryLocations(payload)
                      toast({ title: "Local salvo", description: `Criados: ${res.created} · Atualizados: ${res.updated}` })
                    }
                    setLocationDialogOpen(false)
                    await qc.invalidateQueries({ queryKey: ["canonical", "inventory-locations"] })
                  }}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
