import { z } from "zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FinanceCategory } from "@/api/finance"

const Schema = z.object({
  name: z.string().min(1),
  type: z.enum(["REVENUE", "EXPENSE"]),
  color: z.string().optional().nullable(),
  active: z.boolean().optional(),
})

export type CategoryFormValues = z.infer<typeof Schema>

export function CategoryDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: FinanceCategory | null
  loading?: boolean
  onSubmit: (values: CategoryFormValues) => Promise<void>
}) {
  const defaultValues = useMemo<CategoryFormValues>(
    () => ({ name: "", type: "EXPENSE", color: "#60a5fa", active: true }),
    []
  )

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(Schema),
    defaultValues,
  })

  useEffect(() => {
    if (!props.open) return
    if (props.value) {
      form.reset({
        name: props.value.name,
        type: props.value.type,
        color: props.value.color ?? "",
        active: props.value.active,
      })
    } else {
      form.reset(defaultValues)
    }
  }, [defaultValues, form, props.open, props.value])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.value ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(async (values) => {
            await props.onSubmit(values)
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Ex.: Tecnologia" {...form.register("name")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v as CategoryFormValues["type"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REVENUE">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <Input id="color" placeholder="#60a5fa" {...form.register("color")} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Ativa</div>
              <div className="text-xs text-muted-foreground">Oculta categorias inativas nas seleções.</div>
            </div>
            <Switch checked={form.watch("active") ?? true} onCheckedChange={(v) => form.setValue("active", v)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => props.onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={props.loading}>
              {props.loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

