import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listSales, createSale, updateSale, deleteSale, Sale } from "@/api/canonical"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Trash2, Plus } from "lucide-react"
import { SalesDialog } from "./SalesDialog"
import { toast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export function SalesTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [take, setTake] = useState(20)
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Sale | null>(null)
  const [open, setOpen] = useState(false)

  const sales = useQuery({
    queryKey: ["canonical", "sales", { q: search, take, page }],
    queryFn: async () => listSales({ q: search, take, skip: page * take }),
  })

  const createMut = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      toast({ title: "Venda criada" })
      setOpen(false)
      qc.invalidateQueries({ queryKey: ["canonical", "sales"] })
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (data: Parameters<typeof updateSale>[1]) => updateSale(editing!.id, data),
    onSuccess: () => {
      toast({ title: "Venda atualizada" })
      setOpen(false)
      setEditing(null)
      qc.invalidateQueries({ queryKey: ["canonical", "sales"] })
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteSale,
    onSuccess: () => {
      toast({ title: "Venda excluída" })
      qc.invalidateQueries({ queryKey: ["canonical", "sales"] })
    },
  })

  const items = sales.data?.items ?? []
  const total = sales.data?.total ?? 0

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Vendas</CardTitle>
            <div className="flex items-center gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
                <Button onClick={() => { setEditing(null); setOpen(true) }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Venda
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Forma de Pagamento</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-24"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sales.isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-4">Carregando...</TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-4">Nenhuma venda encontrada</TableCell></TableRow>
                        ) : (
                            items.map((sale) => (
                                <TableRow key={sale.id}>
                                    <TableCell>{new Date(sale.date).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>{sale.customer?.name ?? "—"}</TableCell>
                                    <TableCell>{sale.paymentMethod?.name ?? "—"}</TableCell>
                                    <TableCell>{sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell>{sale.status}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditing(sale); setOpen(true) }}>
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
                                                        <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteMut.mutate(sale.id)}>Excluir</AlertDialogAction>
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
        <SalesDialog 
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
