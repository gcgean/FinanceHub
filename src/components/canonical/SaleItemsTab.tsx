import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { listSaleItems } from "@/api/canonical"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SaleItemsTab() {
  const [search, setSearch] = useState("")
  const [take, setTake] = useState(20)
  const [page, setPage] = useState(0)

  const itemsQuery = useQuery({
    queryKey: ["canonical", "sale-items", { q: search, take, page }],
    queryFn: async () => listSaleItems({ q: search, take, skip: page * take }),
  })

  const items = itemsQuery.data?.items ?? []
  const total = itemsQuery.data?.total ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Itens de Venda</CardTitle>
        <div className="flex items-center gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por descrição..." className="w-72" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Unitário</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Venda (Data)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsQuery.isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-4">Carregando...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-4">Nenhum item encontrado</TableCell></TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                    <TableCell>{item.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                    <TableCell>{item.sale?.date ? new Date(item.sale.date).toLocaleDateString('pt-BR') : "-"}</TableCell>
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
    </Card>
  )
}
