import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listAccounts, listAccountTypes, createAccount, updateAccount, type Account } from "@/api/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { AccountDialog } from "@/components/finance/AccountDialog"

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function AccountsSection() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)

  const types = useQuery({
    queryKey: ["finance", "accountTypes"],
    queryFn: listAccountTypes,
  })

  const accounts = useQuery({
    queryKey: ["finance", "accounts"],
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

  const items = useMemo(() => {
    const list = accounts.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((a) => a.description.toLowerCase().includes(q) || a.code.toLowerCase().includes(q))
  }, [accounts.data, search])

  const isBusy = accounts.isLoading || types.isLoading

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contas</CardTitle>
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
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setOpen(true) }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
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
