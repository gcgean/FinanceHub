import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createCostCenter, listCostCenters, updateCostCenter, type CostCenter } from "@/api/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { CostCenterDialog } from "@/components/finance/CostCenterDialog"

export function CostCentersSection() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CostCenter | null>(null)

  const costCenters = useQuery({
    queryKey: ["finance", "costCenters"],
    queryFn: listCostCenters,
  })

  const createMut = useMutation({
    mutationFn: createCostCenter,
    onSuccess: async () => {
      toast({ title: "Centro de custo criado" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["finance", "costCenters"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<{ code: string; description: string; active: boolean }> }) => updateCostCenter(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Centro de custo atualizado" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["finance", "costCenters"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const items = useMemo(() => {
    const list = costCenters.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => c.description.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
  }, [costCenters.data, search])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Centros de custo</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por descrição ou código..." className="w-72" />
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo
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
                <TableHead className="w-24 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costCenters.isLoading ? (
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.code}</TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true) }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">Nenhum centro de custo encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <CostCenterDialog
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
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
