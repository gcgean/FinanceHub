import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createChartAccount, deleteChartAccount, listChartAccounts, updateChartAccount, type ChartAccount } from "@/api/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2, Upload, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ChartAccountDialog } from "@/components/finance/ChartAccountDialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useAuthStore } from "@/stores/authStore"
import { Badge } from "@/components/ui/badge"
import { ApiResponseError } from "@/utils/api"
import * as XLSX from "xlsx"
import { downloadXlsx } from "@/utils/xlsx"
type ImportRow = {
  externalCode?: string | null
  code?: string | null
  description?: string | null
  planType?: "SINTETICA" | "ANALITICA" | string | null
  revenueExpense?: "RECEITA" | "DESPESA" | string | null
  debitCredit?: "DEBITO" | "CREDITO" | string | null
  parentCode?: string | null
  active?: number | boolean | null
  isGlobal?: number | boolean | null
}

export function ChartAccountsSection() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === "ADMIN"
  const token = useAuthStore((s) => s.token)
  const companyId = useAuthStore((s) => s.companyId)

  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ChartAccount | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  const chart = useQuery({
    queryKey: ["finance", "chartAccounts", { companyId }],
    enabled: Boolean(token),
    queryFn: () => listChartAccounts({ includeGlobal: true }),
  })

  const createMut = useMutation({
    mutationFn: createChartAccount,
    onSuccess: async () => {
      toast({ title: "Conta criada" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["finance", "chartAccounts"] })
    },
    onError: (e: unknown) => {
      const code = e instanceof ApiResponseError ? e.code : undefined
      const msg =
        code === "ANALITICA_REQUIRES_PARENT"
          ? "Selecione o Pai para contas ANALÍTICAS"
          : code === "CHART_ACCOUNT_CODE_EXISTS"
          ? "Código já existe"
          : code === "PARENT_SCOPE_MISMATCH"
          ? "Pai não pertence ao mesmo escopo"
          : code === "FORBIDDEN"
          ? "Sem permissão para criar conta global"
          : e instanceof Error
          ? e.message
          : undefined
      toast({ title: "Erro ao criar", description: msg, variant: "destructive" })
    },
  })

  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<Parameters<typeof createChartAccount>[0]> }) => updateChartAccount(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Conta atualizada" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["finance", "chartAccounts"] })
    },
    onError: (e: unknown) => {
      const code = e instanceof ApiResponseError ? e.code : undefined
      const msg =
        code === "CHART_ACCOUNT_CODE_EXISTS"
          ? "Código já existe"
          : code === "FORBIDDEN"
          ? "Sem permissão para alterar conta global"
          : code === "NOT_FOUND"
          ? "Conta não encontrada ou fora do escopo"
          : e instanceof Error
          ? e.message
          : undefined
      toast({ title: "Erro ao atualizar", description: msg, variant: "destructive" })
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteChartAccount,
    onSuccess: async () => {
      toast({ title: "Conta excluída" })
      await qc.invalidateQueries({ queryKey: ["finance", "chartAccounts"] })
    },
    onError: (e: unknown) => {
      const code = e instanceof ApiResponseError ? e.code : undefined
      const msg =
        code === "CANNOT_DELETE_WITH_CHILDREN"
          ? "Conta possui contas-filhas"
          : code === "FORBIDDEN"
          ? "Apenas ADMIN pode excluir contas globais"
          : code === "NOT_FOUND"
          ? "Conta não pertence à empresa selecionada"
          : e instanceof Error
          ? e.message
          : undefined
      toast({ title: "Erro ao excluir", description: msg, variant: "destructive" })
    },
  })

  const items = useMemo(() => {
    const list = chart.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => c.description.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
  }, [chart.data, search])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Plano de contas</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por descrição ou código..." className="w-72" />
          <Button variant="outline" onClick={() => {
            const headers = ["externalCode", "code", "description", "planType", "revenueExpense", "debitCredit", "parentCode", "active", "isGlobal"]
            const rows: (string | number | null)[][] = [
              ["EXT-RECEITA", "1", "Receitas", "SINTETICA", "RECEITA", "CREDITO", "", 1, 0],
              ["EXT-ENERGIA", "", "Energia", "ANALITICA", "DESPESA", "DEBITO", "1", 1, 0],
            ]
            downloadXlsx("modelo_plano_contas.xlsx", headers, rows, "PlanoContas")
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
                <TableHead className="w-28">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-36">Tipo</TableHead>
                <TableHead className="w-32">Grupo</TableHead>
                <TableHead className="w-28">Escopo</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chart.isLoading ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((c) => {
                  const isGlobal = c.companyId === null
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.code}</TableCell>
                      <TableCell>{c.description}</TableCell>
                      <TableCell className="text-muted-foreground">{c.planType}</TableCell>
                      <TableCell>
                        <Badge variant={c.revenueExpense === "RECEITA" ? "default" : "secondary"}>
                          {c.revenueExpense}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{isGlobal ? "GLOBAL" : "EMPRESA"}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true) }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isGlobal && !isAdmin}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir conta do plano?</AlertDialogTitle>
                              </AlertDialogHeader>
                              <div className="text-sm text-muted-foreground">
                                Essa ação não pode ser desfeita. Se a conta possuir filhos, o backend recusará.
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    await deleteMut.mutateAsync(c.id)
                                  }}
                                >
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
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <ChartAccountDialog
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
          value={editing}
          options={chart.data ?? []}
          loading={createMut.isPending || updateMut.isPending}
          canCreateGlobal={isAdmin}
          onSubmit={async (data) => {
            const desc = data.description?.trim()
            if (!desc || !data.planType || !data.revenueExpense || !data.debitCredit || !data.fixedVariable || !data.costExpense) {
              toast({ title: "Preencha os campos obrigatórios", variant: "destructive" })
              return
            }
            if (editing) {
              await updateMut.mutateAsync({
                id: editing.id,
                body: { ...data, description: desc, code: data.code ? data.code : undefined },
              })
            } else {
              await createMut.mutateAsync({
                description: desc,
                planType: data.planType!,
                revenueExpense: data.revenueExpense!,
                debitCredit: data.debitCredit!,
                fixedVariable: data.fixedVariable!,
                costExpense: data.costExpense!,
                code: data.code ? data.code : undefined,
                active: data.active,
                parentId: data.parentId ?? null,
                isGlobal: (data as unknown as { isGlobal?: boolean }).isGlobal,
              })
            }
          }}
        />
        <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Importar plano de contas via Excel</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Colunas: externalCode, code, description, planType (SINTETICA/ANALITICA), revenueExpense (RECEITA/DESPESA), debitCredit (DEBITO/CREDITO), parentCode (para analíticas), active (1/0), isGlobal (1/0, apenas ADMIN).
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
                    const byCode: Record<string, ChartAccount> = {}
                    const byExt: Record<string, ChartAccount> = {}
                    for (const c of (chart.data ?? [])) {
                      byCode[c.code] = c
                      if (c.accountingCode) byExt[c.accountingCode] = c
                    }
                    const parseBool = (v: unknown): boolean | undefined => {
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
                      const rowIndex = rows.indexOf(r) + 2
                      const externalCode = String(r.externalCode ?? "").trim() || null
                      const code = String(r.code ?? "").trim()
                      const description = r.description === null ? "" : String(r.description ?? "").trim()
                      const planType = String(r.planType ?? "").trim().toUpperCase() as "SINTETICA" | "ANALITICA"
                      const revenueExpense = String(r.revenueExpense ?? "").trim().toUpperCase() as "RECEITA" | "DESPESA"
                      const debitCredit = String(r.debitCredit ?? "").trim().toUpperCase() as "DEBITO" | "CREDITO"
                      const parentCode = String(r.parentCode ?? "").trim()
                      const active = parseBool(r.active)
                      const isGlobalFlag = parseBool(r.isGlobal) ?? false
                      if (!description || !planType || !revenueExpense || !debitCredit) {
                        failed++; errors.push(`Linha ${rowIndex}: campos obrigatórios ausentes`)
                        continue
                      }
                      if (planType === "ANALITICA" && !parentCode) {
                        failed++; errors.push(`Linha ${rowIndex}: parentCode obrigatório para ANALITICA`)
                        continue
                      }
                      try {
                        const existing = externalCode ? byExt[externalCode] : (code ? byCode[code] : undefined)
                        if (existing) {
                          const payload: Partial<Parameters<typeof createChartAccount>[0]> = {}
                          payload.description = description
                          payload.planType = planType
                          payload.revenueExpense = revenueExpense
                          payload.debitCredit = debitCredit
                          if (active !== undefined) payload.active = active
                          payload.accountingCode = externalCode
                          if (planType === "ANALITICA") {
                            const parent = byCode[parentCode]
                            if (!parent) {
                              failed++; errors.push(`Linha ${rowIndex}: parentCode não encontrado`)
                              continue
                            }
                            payload.parentId = parent.id
                          } else {
                            payload.parentId = null
                          }
                          await updateMut.mutateAsync({ id: existing.id, body: payload })
                          updated++
                        } else {
                          const payload: Parameters<typeof createChartAccount>[0] = {
                            description,
                            planType,
                            revenueExpense,
                            debitCredit,
                            fixedVariable: "VARIAVEL",
                            costExpense: revenueExpense === "DESPESA" ? "DESPESA" : "CUSTO",
                            code: code || undefined,
                            active,
                            parentId: null,
                            accountingCode: externalCode,
                            isGlobal: isAdmin ? isGlobalFlag : false,
                          }
                          if (planType === "ANALITICA") {
                            const parent = byCode[parentCode]
                            if (!parent) {
                              failed++; errors.push(`Linha ${rowIndex}: parentCode não encontrado`)
                              continue
                            }
                            payload.parentId = parent.id
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
                    await qc.invalidateQueries({ queryKey: ["finance", "chartAccounts"] })
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
