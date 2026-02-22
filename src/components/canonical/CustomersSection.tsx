import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listCustomers, createCustomer, updateCustomer, deleteCustomer, createCustomerDeactivation, type Customer } from "@/api/canonical"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2, Upload, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { CustomerDialog } from "@/components/canonical/CustomerDialog"
import { useAuthStore } from "@/stores/authStore"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import * as XLSX from "xlsx"
import { downloadXlsx } from "@/utils/xlsx"
type ImportRow = {
  externalId?: string | null
  name?: string | null
  document?: string | null
  email?: string | null
  phone?: string | null
  phone2?: string | null
  birthDate?: string | null
  city?: string | null
  stateCode?: string | null
  neighborhood?: string | null
  value?: number | string | null
  isActive?: number | boolean | string | null
}

export function CustomersSection() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Customer | null>(null)
  const [open, setOpen] = useState(false)

  const [take, setTake] = useState(20)
  const [page, setPage] = useState(0)
  const customers = useQuery<{ items: Customer[]; total: number; take: number; skip: number }>({
    queryKey: ["canonical", "customers", { companyId, q: search, take, page }],
    queryFn: async () => listCustomers({ q: search, take, skip: page * take }),
  })

  const createMut = useMutation({
    mutationFn: async (payload: Parameters<typeof createCustomer>[0]) => createCustomer(payload),
    onSuccess: async () => {
      toast({ title: "Cliente criado" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "customers"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: async (payload: Parameters<typeof updateCustomer>[1]) => updateCustomer(editing!.id, payload),
    onSuccess: async () => {
      toast({ title: "Cliente atualizado" })
      setEditing(null); setOpen(false)
      await qc.invalidateQueries({ queryKey: ["canonical", "customers"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteCustomer(id),
    onSuccess: async () => {
      toast({ title: "Cliente excluído" })
      await qc.invalidateQueries({ queryKey: ["canonical", "customers"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const items = useMemo(() => customers.data?.items ?? [], [customers.data?.items])
  const total = customers.data?.total ?? 0
  const isBusy = customers.isLoading || customers.isFetching
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Clientes</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
          <Button variant="outline" onClick={() => {
            const headers = ["externalId", "name", "document", "email", "phone", "phone2", "birthDate", "city", "stateCode", "neighborhood", "value", "isActive"]
            const rows = (customers.data?.items ?? []).map((c) => [
              c.externalId ?? null,
              c.name,
              c.document ?? null,
              c.email ?? null,
              c.phone ?? null,
              c.phone2 ?? null,
              c.birthDate ?? null,
              c.city ?? null,
              c.stateCode ?? null,
              c.neighborhood ?? null,
              c.value ?? null,
              c.isActive ? 1 : 0,
            ])
            downloadXlsx("clientes.xlsx", headers, rows, "Clientes")
          }}>
            <Download className="w-4 h-4 mr-2" />
            Exportar XLSX
          </Button>
          <Button variant="outline" onClick={() => {
            const headers = ["externalId", "name", "document", "email", "phone", "phone2", "birthDate", "city", "stateCode", "neighborhood", "value", "isActive"]
            const rows: (string | number | null)[][] = [
              ["CLI-001", "Cliente A", "12345678900", "a@ex.com", "(11) 0000-0000", "", "1990-01-01", "São Paulo", "SP", "", 1000, 1],
              ["CLI-002", "Cliente B", "", "", "", "", "", "", "", "", null, 1],
            ]
            downloadXlsx("modelo_clientes.xlsx", headers, rows, "Clientes")
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
                <TableHead>Documento</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isBusy ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.document ?? "—"}</TableCell>
                    <TableCell>{a.email ?? "—"}</TableCell>
                    <TableCell>{a.phone ?? "—"}</TableCell>
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
                              <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
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
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <CustomerDialog
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
          value={editing}
          loading={createMut.isPending || updateMut.isPending}
          onSubmit={async (values) => {
            const name = values.name?.trim()
            if (!name) {
              toast({ title: "Informe o nome do cliente", variant: "destructive" })
              return
            }
            if (editing) {
              const wasActive = editing.isActive
              await updateMut.mutateAsync({ ...values, name })
              if (wasActive && values.isActive === false) {
                await createCustomerDeactivation(editing.id, { value: values.value ?? null, reason: values.deactivationReason ?? null })
              }
            } else {
              const created = await createCustomer({ ...values, name })
              if ((values.isActive ?? true) === false && (created as Customer)?.id) {
                await createCustomerDeactivation((created as Customer).id, { value: values.value ?? null, reason: values.deactivationReason ?? null })
              }
            }
          }}
        />
        <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Importar clientes via Excel</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Colunas: externalId, name, document, email, phone, phone2, birthDate (YYYY-MM-DD), city, stateCode, neighborhood, value, isActive (1/0).
                Atualiza quando externalId existir; senão, cria novo.
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
                    for (const c of (customers.data?.items ?? [])) {
                      if (c.externalId) byExt[c.externalId] = c.id
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
                      const externalId = String(r.externalId ?? "").trim() || null
                      const name = r.name === null ? "" : String(r.name ?? "").trim()
                      const document = String(r.document ?? "").trim() || null
                      const email = String(r.email ?? "").trim() || null
                      const phone = String(r.phone ?? "").trim() || null
                      const phone2 = String(r.phone2 ?? "").trim() || null
                      const birthDate = String(r.birthDate ?? "").trim() || null
                      const city = String(r.city ?? "").trim() || null
                      const stateCode = String(r.stateCode ?? "").trim() || null
                      const neighborhood = String(r.neighborhood ?? "").trim() || null
                      const value = parseNumber(r.value)
                      const isActive = parseBool(r.isActive)
                      const deactReason = (r as unknown as { deactivationReason?: string }).deactivationReason ?? null
                      const deactDate = (r as unknown as { deactivatedAt?: string }).deactivatedAt ?? null
                      try {
                        if (externalId && byExt[externalId]) {
                          const id = byExt[externalId]
                          const body: Partial<Customer> = {}
                          if (name) body.name = name
                          if (document !== null) body.document = document || null
                          if (email !== null) body.email = email || null
                          if (phone !== null) body.phone = phone || null
                          if (phone2 !== null) body.phone2 = phone2 || null
                          if (birthDate !== null) body.birthDate = birthDate || null
                          if (city !== null) body.city = city || null
                          if (stateCode !== null) body.stateCode = stateCode || null
                          if (neighborhood !== null) body.neighborhood = neighborhood || null
                          if (value !== undefined) body.value = value
                          if (isActive !== undefined) body.isActive = isActive
                          if (!Object.keys(body).length) {
                            failed++; errors.push(`Linha ${rowIndex}: nenhum campo para atualizar`)
                            continue
                          }
                          await updateCustomer(id, body)
                          if (isActive === false) {
                            await createCustomerDeactivation(id, { value: value ?? null, reason: deactReason ?? null, deactivatedAt: deactDate ?? undefined })
                          }
                          updated++
                        } else {
                          if (!name) {
                            failed++; errors.push(`Linha ${rowIndex}: name obrigatório para criar`)
                            continue
                          }
                          const createPayload: Parameters<typeof createCustomer>[0] = {
                            name,
                            externalId,
                            document,
                            email,
                            phone,
                            phone2,
                            birthDate: birthDate || undefined,
                            city,
                            stateCode,
                            neighborhood,
                            value: value ?? null,
                            isActive: isActive ?? true,
                          }
                          const createdCustomer = await createCustomer(createPayload)
                          if ((isActive ?? true) === false && (createdCustomer as Customer)?.id) {
                            await createCustomerDeactivation((createdCustomer as Customer).id, { value: value ?? null, reason: deactReason ?? null, deactivatedAt: deactDate ?? undefined })
                          }
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
                    await qc.invalidateQueries({ queryKey: ["canonical", "customers"] })
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
