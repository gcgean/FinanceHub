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
import type { Account, AccountType } from "@/api/finance"

const Schema = z.object({
  code: z.string().optional(),
  description: z.string().min(1),
  accountTypeId: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

export type AccountFormValues = z.infer<typeof Schema>

export function AccountDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: Account | null
  types: AccountType[]
  loading?: boolean
  onSubmit: (values: AccountFormValues) => Promise<void>
}) {
  const defaultValues = useMemo<AccountFormValues>(
    () => ({ code: "", description: "", accountTypeId: null, active: true }),
    []
  )

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(Schema),
    defaultValues,
  })

  useEffect(() => {
    if (!props.open) return
    if (props.value) {
      form.reset({
        code: props.value.code,
        description: props.value.description,
        accountTypeId: props.value.accountTypeId,
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
          <DialogTitle>{props.value ? "Editar conta" : "Nova conta"}</DialogTitle>
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
              <Input id="code" placeholder="01" {...form.register("code")} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.watch("accountTypeId") ?? "__default__"}
                onValueChange={(v) => form.setValue("accountTypeId", v === "__default__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">(Padrão)</SelectItem>
                  {props.types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.code} — {t.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" placeholder="Banco do Brasil" {...form.register("description")} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Ativa</div>
              <div className="text-xs text-muted-foreground">Oculta contas inativas nas seleções.</div>
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
