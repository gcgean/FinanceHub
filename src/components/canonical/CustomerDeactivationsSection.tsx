import { useQuery } from "@tanstack/react-query"
import { listCustomerDeactivations } from "@/api/canonical"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import { useAuthStore } from "@/stores/authStore"

export function CustomerDeactivationsSection() {
  const companyId = useAuthStore((s) => s.companyId)
  const [search, setSearch] = useState("")
  const token = useAuthStore((s) => s.token)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["canonical", "customerDeactivations", { companyId }],
    queryFn: listCustomerDeactivations,
    enabled: Boolean(token),
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
        (d.reason ?? "").toLowerCase().includes(q)
      )
    })
  }, [data, search])
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Desativações de clientes</CardTitle>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente, documento ou motivo..." className="w-72" />
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
                    <TableCell className="text-muted-foreground">{d.reason ?? "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Nenhuma desativação encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
