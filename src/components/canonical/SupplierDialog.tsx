import React from "react"
import { z } from "zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { Supplier } from "@/api/canonical"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { useQuery } from "@tanstack/react-query"
import { listStates, listCities } from "@/api/geo"
import { CityCombobox } from "@/components/geo/CityCombobox"
import { StateCombobox } from "@/components/geo/StateCombobox"

const Schema = z.object({
  name: z.string().min(1),
  externalId: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export type SupplierFormValues = z.infer<typeof Schema>

export function SupplierDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: Supplier | null
  loading?: boolean
  onSubmit: (values: SupplierFormValues) => Promise<void>
}) {
  const defaultValues = useMemo<SupplierFormValues>(
    () => ({ name: "", externalId: null, document: null, email: null, phone: null, phone2: null, city: null, cityId: null, state: null, stateCode: null, isActive: true }),
    []
  )

  const form = useForm<SupplierFormValues>({ resolver: zodResolver(Schema), defaultValues })

  useEffect(() => {
    if (!props.open) return
    if (props.value) {
      form.reset({
        name: props.value.name,
        externalId: props.value.externalId ?? null,
        document: props.value.document,
        email: props.value.email,
        phone: props.value.phone,
        phone2: props.value.phone2 ?? null,
        city: props.value.city,
        cityId: props.value.cityId ?? null,
        state: props.value.state,
        stateCode: props.value.stateCode ?? null,
        isActive: props.value.isActive,
      })
    } else {
      form.reset(defaultValues)
    }
  }, [defaultValues, form, props.open, props.value])

  const [stateSearch, setStateSearch] = React.useState("")
  const states = useQuery({ queryKey: ["geo", "states", stateSearch], queryFn: async () => listStates({ search: stateSearch }) })
  const [citySearch, setCitySearch] = React.useState("")
  const [cityTake, setCityTake] = React.useState(50)
  const [cityPage, setCityPage] = React.useState(0)
  const cities = useQuery({
    queryKey: ["geo", "cities", form.watch("state"), citySearch, cityTake, cityPage],
    queryFn: async () => listCities({ state: form.watch("state") ?? undefined, search: citySearch, take: cityTake, skip: cityPage * cityTake }),
  })
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.value ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
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
              <Input placeholder="Nome" {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Documento</Label>
              <Input placeholder="CPF/CNPJ" {...form.register("document")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>ID Externo (ERP)</Label>
              <Input placeholder="Código no ERP de origem" {...form.register("externalId")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="email@exemplo.com" {...form.register("email")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input placeholder="(00) 00000-0000" {...form.register("phone")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Telefone 2</Label>
              <Input placeholder="(00) 00000-0000" {...form.register("phone2")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <CityCombobox
                state={form.watch("state")}
                valueName={form.watch("city") ?? null}
                onChange={(c) => {
                  form.setValue("city", c.name)
                  form.setValue("cityId", c.id)
                  form.setValue("state", c.stateCode)
                  form.setValue("stateCode", c.stateCode)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <StateCombobox
                value={form.watch("state") ?? ""}
                onChange={(v) => { form.setValue("state", v); form.setValue("stateCode", v) }}
                disabled={Boolean(form.watch("city"))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Ativo</div>
              <div className="text-xs text-muted-foreground">Fornecedores inativos ficam ocultos nas seleções.</div>
            </div>
            <Switch checked={form.watch("isActive") ?? true} onCheckedChange={(v) => form.setValue("isActive", v)} />
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
