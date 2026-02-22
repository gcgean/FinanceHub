import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, PaymentMethod } from "@/api/canonical"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Trash2, Plus } from "lucide-react"
import { PaymentMethodDialog } from "./PaymentMethodDialog"
import { toast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export function PaymentMethodsTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [take, setTake] = useState(20)
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [open, setOpen] = useState(false)

  const pmQuery = useQuery({
    queryKey: ["canonical", "payment-methods", { q: search, take, page }],
    queryFn: async () => listPaymentMethods({ q: search, take, skip: page * take }),
  })

  const createMut = useMutation({
    mutationFn: createPaymentMethod,
    onSuccess: () => {
      toast({ title: "Forma de pagamento criada" })
      setOpen(false)
      qc.invalidateQueries({ queryKey: ["canonical", "payment-methods"] })
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (data: Parameters<typeof updatePaymentMethod>[1]) => updatePaymentMethod(editing!.id, data),
    onSuccess: () => {
      toast({ title: "Forma de pagamento atualizada" })
      setOpen(false)
      setEditing(null)
      qc.invalidateQueries({ queryKey: ["canonical", "payment-methods"] })
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: () => {
      toast({ title: "Forma de pagamento excluída" })
      qc.invalidateQueries({ queryKey: ["canonical", "payment-methods"] })
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  })

  const items = pmQuery.data?.items ?? []
  const total = pmQuery.data?.total ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Formas de Pagamento</CardTitle>
        <div className="flex items-center gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
            <Button onClick={() => { setEditing(null); setOpen(true) }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Forma de Pagamento
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pmQuery.isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-4">Carregando...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-4">Nenhum registro encontrado</TableCell></TableRow>
              ) : (
                items.map((pm) => (
                  <TableRow key={pm.id}>
                    <TableCell>{pm.name}</TableCell>
                    <TableCell>{pm.enabled ? "Sim" : "Não"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(pm); setOpen(true) }}>
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
                              <AlertDialogTitle>Excluir forma de pagamento?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMut.mutate(pm.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Total: {total}</div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Anterior</Button>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * take >= total}>Próxima</Button>
            </div>
        </div>
      </CardContent>
      <PaymentMethodDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if(!v) setEditing(null) }}
        value={editing}
        loading={createMut.isPending || updateMut.isPending}
        onSubmit={async (val) => {
            if (editing) {
                await updateMut.mutateAsync(val)
            } else {
                await createMut.mutateAsync(val)
            }
        }}
      />
    </Card>
  )
}
