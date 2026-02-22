import { z } from "zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LiveCurrencyInput } from "@/components/ui/LiveCurrencyInput"
import type { Product } from "@/api/canonical"

const Schema = z.object({
  code: z.string().optional(),
  externalId: z.string().optional().nullable(),
  name: z.string().min(1),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  section: z.string().optional().nullable(),
  group: z.string().optional().nullable(),
  subgroup: z.string().optional().nullable(),
  brandName: z.string().optional().nullable(),
  costPrice: z.number().optional().nullable(),
  salePrice: z.number().optional().nullable(),
  active: z.boolean().optional(),
})

export type ProductFormValues = z.infer<typeof Schema>

export function ProductDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: Product | null
  loading?: boolean
  onSubmit: (values: ProductFormValues) => Promise<void>
}) {
  const defaultValues = useMemo<ProductFormValues>(
    () => ({ code: undefined, externalId: null, name: "", sku: null, barcode: null, section: null, group: null, subgroup: null, brandName: null, costPrice: null, salePrice: null, active: true }),
    []
  )

  const form = useForm<ProductFormValues>({ resolver: zodResolver(Schema), defaultValues })

  useEffect(() => {
    if (!props.open) return
    if (props.value) {
      form.reset({
        code: props.value.code,
        externalId: props.value.externalId,
        name: props.value.name,
        sku: props.value.sku,
        barcode: props.value.barcode,
        section: props.value.section,
        group: props.value.group,
        subgroup: props.value.subgroup,
        brandName: props.value.brandName,
        costPrice: props.value.costPrice,
        salePrice: props.value.salePrice,
        active: props.value.active,
      })
    } else {
      form.reset(defaultValues)
    }
  }, [defaultValues, form, props.open, props.value])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.value ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(async (values) => {
            await props.onSubmit(values)
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Nome do produto" {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Código</Label>
              <Input placeholder="(gerado automaticamente)" {...form.register("code")} disabled={!props.value} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Barcode</Label>
              <Input placeholder="Código de barras" {...form.register("barcode")} />
            </div>
            <div className="space-y-2">
              <Label>ID Externo (ERP)</Label>
              <Input placeholder="Código no ERP" {...form.register("externalId")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Seção</Label>
              <Input placeholder="Seção" {...form.register("section")} />
            </div>
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Input placeholder="Grupo" {...form.register("group")} />
            </div>
            <div className="space-y-2">
              <Label>Subgrupo</Label>
              <Input placeholder="Subgrupo" {...form.register("subgroup")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input placeholder="Marca" {...form.register("brandName")} />
            </div>
            <div className="space-y-2">
              <Label>Preço de custo</Label>
              <LiveCurrencyInput value={form.watch("costPrice") ?? null} onChange={(v) => form.setValue("costPrice", v)} placeholder="Custo" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Preço de venda</Label>
              <LiveCurrencyInput value={form.watch("salePrice") ?? null} onChange={(v) => form.setValue("salePrice", v)} placeholder="Venda" />
            </div>
            <div className="space-y-2">
              <Label>Margem</Label>
              <Input
                disabled
                value={(() => {
                  const c = form.watch("costPrice") ?? null
                  const s = form.watch("salePrice") ?? null
                  if (c == null || s == null) return ""
                  const mv = s - c
                  const mp = s > 0 ? (mv / s) * 100 : 0
                  const v = mv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  const p = `${mp.toFixed(2)}%`
                  return `${v} (${p})`
                })()}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Ativo</div>
                <div className="text-xs text-muted-foreground">Produtos inativos ficam ocultos nas seleções.</div>
              </div>
              <Switch checked={form.watch("active") ?? true} onCheckedChange={(v) => form.setValue("active", v)} />
            </div>
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
