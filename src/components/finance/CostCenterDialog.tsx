import { z } from "zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { CostCenter } from "@/api/finance"

const Schema = z.object({
  code: z.string().optional(),
  externalCode: z.string().optional().nullable(),
  description: z.string().min(1),
  active: z.boolean().optional(),
})

export type CostCenterFormValues = z.infer<typeof Schema>

export function CostCenterDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: CostCenter | null
  loading?: boolean
  onSubmit: (values: CostCenterFormValues) => Promise<void>
}) {
  const defaultValues = useMemo<CostCenterFormValues>(() => ({ code: undefined, externalCode: null, description: "", active: true }), [])
  const form = useForm<CostCenterFormValues>({ resolver: zodResolver(Schema), defaultValues })

  useEffect(() => {
    if (!props.open) return
    if (props.value) {
      form.reset({ code: props.value.code, externalCode: props.value.externalCode, description: props.value.description, active: props.value.active })
    } else {
      form.reset(defaultValues)
    }
  }, [defaultValues, form, props.open, props.value])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.value ? "Editar centro de custo" : "Novo centro de custo"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(async (values) => {
            await props.onSubmit(values)
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" placeholder="(gerado automaticamente)" {...form.register("code")} disabled={!props.value} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalCode">Código externo (ERP)</Label>
              <Input id="externalCode" placeholder="Ex.: CC-ADM" {...form.register("externalCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" placeholder="Administrativo" {...form.register("description")} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Ativo</div>
              <div className="text-xs text-muted-foreground">Centros inativos ficam ocultos nas seleções.</div>
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
