import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listCustomerDeactivations, listCustomerDeactivationReasons, listCustomers, createCustomerDeactivation } from "@/api/canonical"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"

export function CustomerDeactivationsSection() {
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const token = useAuthStore((s) => s.token)
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["canonical", "customerDeactivations", { companyId }],
    queryFn: listCustomerDeactivations,
    enabled: Boolean(token),
  })
  const reasons = useQuery({
    queryKey: ["canonical", "customerDeactivationReasons", { companyId }],
    queryFn: listCustomerDeactivationReasons,
    enabled: Boolean(token),
  })
  const customers = useQuery({
    queryKey: ["canonical", "customers", { companyId, q: "", status: "active", take: 100, page: 0 }],
    queryFn: async () => listCustomers({ status: "active", take: 100, skip: 0 }),
    enabled: Boolean(token),
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null)
  const [value, setValue] = useState<string>("")
  const [date, setDate] = useState<string>("")
  const createMut = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId) throw new Error("Selecione o cliente")
      return createCustomerDeactivation(selectedCustomerId, {
        value: value ? Number(value) : null,
        reasonId: selectedReasonId ?? null,
        deactivatedAt: date || undefined,
      })
    },
    onSuccess: async () => {
      toast({ title: "Desativação registrada" })
      setDialogOpen(false); setSelectedCustomerId(null); setSelectedReasonId(null); setValue(""); setDate("")
      await qc.invalidateQueries({ queryKey: ["canonical", "customerDeactivations"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao desativar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const items = useMemo(() => {
    const list = data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((d) => {
      const c = d.customer
      return (
        c.name.toLowerCase().includes(q) ||
        (c.document ?? "").toLowerCase().includes(q) ||
        (c.externalId ?? "").toLowerCase().includes(q) ||
        (d.reason ?? d.reasonRef?.description ?? "").toLowerCase().includes(q)
      )
    })
  }, [data, search])
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Desativações de clientes</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente, documento ou motivo..." className="w-72" />
          <Button onClick={() => setDialogOpen(true)}>Cadastrar desativação</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>Importar motivos (XLSX)</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>ERP</TableHead>
                <TableHead className="w-32">Valor</TableHead>
                <TableHead className="w-36">Data</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || isFetching ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">Erro ao carregar. {error instanceof Error ? error.message : ""} <button className="underline ml-2" onClick={() => refetch()}>Tentar novamente</button></TableCell></TableRow>
              ) : items.length ? (
                items.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.customer.name}</TableCell>
                    <TableCell>{d.customer.document ?? "—"}</TableCell>
                    <TableCell>{d.customer.externalId ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{d.value == null ? "—" : d.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                    <TableCell>{new Date(d.deactivatedAt).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-muted-foreground">{d.reasonRef?.description ?? d.reason ?? "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Nenhuma desativação encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar desativação</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-sm mb-1">Cliente</div>
              <Select value={selectedCustomerId ?? ""} onValueChange={(v) => setSelectedCustomerId(v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {(customers.data?.items ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.document ? ` · ${c.document}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm mb-1">Motivo</div>
              <Select value={selectedReasonId ?? ""} onValueChange={(v) => setSelectedReasonId(v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                <SelectContent>
                  {(reasons.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm mb-1">Valor (opcional)</div>
              <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <div className="text-sm mb-1">Data (YYYY-MM-DD)</div>
              <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={createMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => createMut.mutate()} disabled={createMut.isPending || !selectedCustomerId}>Salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar motivos via Excel</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Colunas: description, externalId (opcional), active (1/0 opcional). Motivos duplicados por externalId são atualizados.
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const buf = await file.arrayBuffer()
                  const wb = XLSX.read(buf, { type: "array" })
                  const ws = wb.Sheets[wb.SheetNames[0]]
                  const rows: Array<{ description?: string; externalId?: string | null; active?: string | number | boolean | null }> = XLSX.utils.sheet_to_json(ws, { defval: null })
                  let created = 0, updated = 0, failed = 0
                  const byExt = new Map<string, string>()
                  for (const r of (reasons.data ?? [])) {
                    if (r.externalId) byExt.set(r.externalId, r.id)
                  }
                  const parseBool = (v: unknown): boolean | undefined => {
                    if (v === null || v === undefined || v === "") return undefined
                    if (typeof v === "boolean") return v
                    const s = String(v).trim().toLowerCase()
                    if (s === "1" || s === "true") return true
                    if (s === "0" || s === "false") return false
                    return undefined
                  }
                  for (const r of rows) {
                    const description = String(r.description ?? "").trim()
                    const externalId = String(r.externalId ?? "").trim() || null
                    const active = parseBool(r.active)
                    if (!description) { failed++; continue }
                    try {
                      if (externalId && byExt.has(externalId)) {
                        await updateCustomerDeactivationReason(byExt.get(externalId)!, { description, active })
                        updated++
                      } else {
                        await createCustomerDeactivationReason({ description, externalId, active })
                        created++
                      }
                    } catch {
                      failed++
                    }
                  }
                  toast({ title: "Importação concluída", description: `Criados: ${created} · Atualizados: ${updated} · Erros: ${failed}` })
                  setImportOpen(false)
                  await qc.invalidateQueries({ queryKey: ["canonical", "customerDeactivationReasons"] })
                } catch (err) {
                  toast({ title: "Erro ao importar", description: err instanceof Error ? err.message : undefined, variant: "destructive" })
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction disabled>Processar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
