import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createChartAccount, deleteChartAccount, listChartAccounts, updateChartAccount, type ChartAccount } from "@/api/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ChartAccountDialog } from "@/components/finance/ChartAccountDialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useAuthStore } from "@/stores/authStore"
import { Badge } from "@/components/ui/badge"

export function ChartAccountsSection() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === "ADMIN"

  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ChartAccount | null>(null)

  const chart = useQuery({
    queryKey: ["finance", "chartAccounts"],
    queryFn: () => listChartAccounts({ includeGlobal: true }),
  })

  const createMut = useMutation({
    mutationFn: createChartAccount,
    onSuccess: async () => {
      toast({ title: "Conta criada" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["finance", "chartAccounts"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<Parameters<typeof createChartAccount>[0]> }) => updateChartAccount(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Conta atualizada" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["finance", "chartAccounts"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteChartAccount,
    onSuccess: async () => {
      toast({ title: "Conta excluída" })
      await qc.invalidateQueries({ queryKey: ["finance", "chartAccounts"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
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
            if (editing) {
              await updateMut.mutateAsync({ id: editing.id, body: data })
            } else {
              await createMut.mutateAsync(data)
            }
          }}
        />
      </CardContent>
    </Card>
  )
}
