import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createCategory, deleteCategory, listCategories, updateCategory, type FinanceCategory } from "@/api/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ApiResponseError } from "@/utils/api"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { CategoryDialog } from "@/components/finance/CategoryDialog"
import { cn } from "@/lib/utils"

function typeLabel(t: FinanceCategory["type"]) {
  return t === "REVENUE" ? "Receita" : "Despesa"
}

export function CategoriesSection() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceCategory | null>(null)

  const categories = useQuery({
    queryKey: ["finance", "categories"],
    queryFn: () => listCategories(),
  })

  const createMut = useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      toast({ title: "Categoria criada" })
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ["finance", "categories"] })
    },
    onError: (e: unknown) => {
      const code = e instanceof ApiResponseError ? e.code : undefined
      const msg = code === "CATEGORY_EXISTS" ? "Categoria já existe" : e instanceof Error ? e.message : undefined
      toast({ title: "Erro ao criar", description: msg, variant: "destructive" })
    },
  })

  const updateMut = useMutation({
    mutationFn: (p: { id: string; body: Partial<Parameters<typeof createCategory>[0]> }) => updateCategory(p.id, p.body),
    onSuccess: async () => {
      toast({ title: "Categoria atualizada" })
      setOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["finance", "categories"] })
    },
    onError: (e: unknown) => {
      const code = e instanceof ApiResponseError ? e.code : undefined
      const msg = code === "CATEGORY_EXISTS" ? "Categoria já existe" : e instanceof Error ? e.message : undefined
      toast({ title: "Erro ao atualizar", description: msg, variant: "destructive" })
    },
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteCategory(id),
    onSuccess: async () => {
      toast({ title: "Categoria excluída" })
      await qc.invalidateQueries({ queryKey: ["finance", "categories"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const items = useMemo(() => {
    const list = categories.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories.data, search])

  const busy = categories.isLoading
  const saving = createMut.isPending || updateMut.isPending

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Categorias</CardTitle>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." className="w-72" />
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
                <TableHead>Nome</TableHead>
                <TableHead className="w-32">Tipo</TableHead>
                <TableHead className="w-24">Cor</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {busy ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length ? (
                items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabel(c.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-block w-3 h-3 rounded-full border", !c.color && "bg-muted")} style={c.color ? { backgroundColor: c.color } : undefined} />
                        <span className="text-xs text-muted-foreground">{c.color ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "secondary" : "outline"}>{c.active ? "Ativa" : "Inativa"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true) }}>
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
                              <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => { await deleteMut.mutateAsync(c.id) }}>
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
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Nenhuma categoria encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <CategoryDialog
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
          value={editing}
          loading={saving}
          onSubmit={async (values) => {
            const name = values.name.trim()
            const color = (values.color ?? "").trim() || null
            if (!name) {
              toast({ title: "Informe o nome da categoria", variant: "destructive" })
              return
            }
            if (editing) {
              await updateMut.mutateAsync({ id: editing.id, body: { ...values, name, color } })
            } else {
              await createMut.mutateAsync({ ...values, name, color })
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

