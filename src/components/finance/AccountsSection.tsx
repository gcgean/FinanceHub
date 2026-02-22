import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listAccounts, listAccountTypes, createAccount, updateAccount, deleteAccount, type Account } from "@/api/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2, Upload, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ApiResponseError } from "@/utils/api"
import { AccountDialog } from "@/components/finance/AccountDialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useAuthStore } from "@/stores/authStore"
import * as XLSX from "xlsx"
import { downloadXlsx } from "@/utils/xlsx"
type ImportRow = { externalCode?: string | null; description?: string | null; code?: string | null; active?: number | boolean | null }

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function AccountsSection() {
  const qc = useQueryClient()
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)

  const types = useQuery({
    queryKey: ["finance", "accountTypes"],
    queryFn: listAccountTypes,
  })

  const accounts = useQuery({
    queryKey: ["finance", "accounts", { companyId }],
    queryFn: listAccounts,
  })

  const createMut = useMutation({
    mutationFn: createAccount,
    onSuccess: async () => {
      toast({ title: "Conta criada" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["finance", "accounts"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<Parameters<typeof createAccount>[0]> }) => updateAccount(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Conta atualizada" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["finance", "accounts"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })
  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteAccount(id),
    onSuccess: async () => {
      toast({ title: "Conta excluída" })
      await qc.invalidateQueries({ queryKey: ["finance", "accounts"] })
    },
    onError: (e: unknown) => {
      const code = e instanceof ApiResponseError ? e.code : undefined
      const msg =
        code === "CANNOT_DELETE_IN_USE"
          ? "Conta com lançamentos vinculados"
          : e instanceof Error
          ? e.message
          : undefined
      toast({ title: "Erro ao excluir", description: msg, variant: "destructive" })
    },
  })

  const items = useMemo(() => {
    const list = accounts.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((a) => a.description.toLowerCase().includes(q) || a.code.toLowerCase().includes(q))
  }, [accounts.data, search])

  const isBusy = accounts.isLoading || types.isLoading
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contas</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por descrição ou código..." className="w-72" />
          <Button variant="outline" onClick={() => {
            const headers = ["externalCode", "description", "code", "active"]
            const rows: (string | number | null)[][] = [
              ["BB-001", "Banco do Brasil", "", 1],
              ["ITAU-001", "Itaú", "", 1],
            ]
            downloadXlsx("modelo_contas.xlsx", headers, rows, "Contas")
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
            Nova
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
                <TableHead className="w-44">Tipo</TableHead>
                <TableHead className="w-36 text-right">Saldo</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isBusy ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.code}</TableCell>
                    <TableCell>{a.description}</TableCell>
                    <TableCell className="text-muted-foreground">{a.typeDescription ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(a.balance ?? 0)}</TableCell>
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
                              <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
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
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <AccountDialog
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
          types={types.data ?? []}
          value={editing}
          loading={createMut.isPending || updateMut.isPending}
          onSubmit={async (data) => {
            const desc = data.description?.trim()
            const code = (data.code ?? "").trim()
            const externalCode = (data.externalCode ?? "").trim() || null
            if (!desc) {
              toast({ title: "Informe a descrição da conta", variant: "destructive" })
              return
            }
            if (editing) {
              await updateMut.mutateAsync({ id: editing.id, body: { ...data, description: desc, code: code ? code : undefined, externalCode } })
            } else {
              await createMut.mutateAsync({ ...data, description: desc, code: code ? code : undefined, externalCode })
            }
          }}
        />

        <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Importar contas via Excel</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Use arquivo com colunas: externalCode, description, code, active. Se externalCode existir, atualiza; senão, cria.
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
                    for (const a of (accounts.data ?? [])) {
                      if (a.externalCode) byExt[a.externalCode] = a.id
                    }
                    let created = 0, updated = 0, failed = 0
                    const errors: string[] = []
                    const parseActive = (v: unknown): boolean | undefined => {
                      if (v === null || v === undefined || v === "") return undefined
                      if (typeof v === "boolean") return v
                      const s = String(v).trim().toLowerCase()
                      if (s === "1" || s === "true") return true
                      if (s === "0" || s === "false") return false
                      return undefined
                    }
                    for (const r of rows) {
                      const externalCode = String(r.externalCode ?? "").trim() || null
                      const description = r.description === null ? "" : String(r.description ?? "").trim()
                      const code = String(r.code ?? "").trim()
                      const active = parseActive(r.active)
                      const rowIndex = rows.indexOf(r) + 2 // +2 header + 1-based
                      if (!externalCode && !description) {
                        failed++; errors.push(`Linha ${rowIndex}: informe externalCode ou description`)
                        continue
                      }
                      try {
                        if (externalCode && byExt[externalCode]) {
                          const id = byExt[externalCode]
                          const payload: Partial<Parameters<typeof createAccount>[0]> = {}
                          if (description) payload.description = description
                          if (code) payload.code = code
                          if (externalCode) payload.externalCode = externalCode
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
                    await qc.invalidateQueries({ queryKey: ["finance", "accounts"] })
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
