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
import type { ChartAccount } from "@/api/finance"

const Schema = z
  .object({
    code: z.string().optional(),
    description: z.string().min(1),
    active: z.boolean().optional(),
    planType: z.enum(["SINTETICA", "ANALITICA"]),
    parentId: z.string().nullable().optional(),
    revenueExpense: z.enum(["RECEITA", "DESPESA"]),
    debitCredit: z.enum(["DEBITO", "CREDITO"]),
    fixedVariable: z.enum(["FIXO", "VARIAVEL"]),
    costExpense: z.enum(["CUSTO", "DESPESA"]),
    isGlobal: z.boolean().optional(),
  })
  .refine((v) => (v.planType === "ANALITICA" ? Boolean(v.parentId) : true), {
    path: ["parentId"],
    message: "Selecione uma conta pai para contas analíticas",
  })

export type ChartAccountFormValues = z.infer<typeof Schema>

export function ChartAccountDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: ChartAccount | null
  options: ChartAccount[]
  loading?: boolean
  canCreateGlobal: boolean
  onSubmit: (values: ChartAccountFormValues) => Promise<void>
}) {
  const defaultValues = useMemo<ChartAccountFormValues>(
    () => ({
      code: "",
      description: "",
      active: true,
      planType: "SINTETICA",
      parentId: null,
      revenueExpense: "RECEITA",
      debitCredit: "CREDITO",
      fixedVariable: "VARIAVEL",
      costExpense: "DESPESA",
      isGlobal: false,
    }),
    []
  )

  const form = useForm<ChartAccountFormValues>({ resolver: zodResolver(Schema), defaultValues })

  useEffect(() => {
    if (!props.open) return
    if (props.value) {
      form.reset({
        code: props.value.code,
        description: props.value.description,
        active: props.value.active,
        planType: props.value.planType,
        parentId: props.value.parentId,
        revenueExpense: props.value.revenueExpense,
        debitCredit: props.value.debitCredit,
        fixedVariable: props.value.fixedVariable,
        costExpense: props.value.costExpense,
        isGlobal: props.value.companyId === null,
      })
    } else {
      form.reset(defaultValues)
    }
  }, [defaultValues, form, props.open, props.value])

  const planType = form.watch("planType")
  const canToggleGlobal = props.canCreateGlobal && !props.value
  const parentOptions = useMemo(() => {
    return props.options.filter((o) => o.planType === "SINTETICA")
  }, [props.options])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl">
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
              <Input id="code" placeholder="2.01" {...form.register("code")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" placeholder="Despesas com Energia" {...form.register("description")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={planType} onValueChange={(v) => form.setValue("planType", v as ChartAccountFormValues["planType"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINTETICA">SINTÉTICA</SelectItem>
                  <SelectItem value="ANALITICA">ANALÍTICA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pai</Label>
              <Select
                value={form.watch("parentId") ?? "__none__"}
                onValueChange={(v) => form.setValue("parentId", v === "__none__" ? null : v)}
                disabled={planType !== "ANALITICA"}
              >
                <SelectTrigger><SelectValue placeholder={planType !== "ANALITICA" ? "(Opcional)" : "Selecione"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(Nenhum)</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.code} — {p.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.parentId ? (
                <div className="text-xs text-destructive">{form.formState.errors.parentId.message}</div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select value={form.watch("revenueExpense")} onValueChange={(v) => form.setValue("revenueExpense", v as ChartAccountFormValues["revenueExpense"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEITA">RECEITA</SelectItem>
                  <SelectItem value="DESPESA">DESPESA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Débito/Crédito</Label>
              <Select value={form.watch("debitCredit")} onValueChange={(v) => form.setValue("debitCredit", v as ChartAccountFormValues["debitCredit"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBITO">DEBITO</SelectItem>
                  <SelectItem value="CREDITO">CREDITO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fixo/Variável</Label>
              <Select value={form.watch("fixedVariable")} onValueChange={(v) => form.setValue("fixedVariable", v as ChartAccountFormValues["fixedVariable"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXO">FIXO</SelectItem>
                  <SelectItem value="VARIAVEL">VARIAVEL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Custo/Despesa</Label>
              <Select value={form.watch("costExpense")} onValueChange={(v) => form.setValue("costExpense", v as ChartAccountFormValues["costExpense"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTO">CUSTO</SelectItem>
                  <SelectItem value="DESPESA">DESPESA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Ativa</div>
                <div className="text-xs text-muted-foreground">Oculta contas inativas em filtros.</div>
              </div>
              <Switch checked={form.watch("active") ?? true} onCheckedChange={(v) => form.setValue("active", v)} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Global</div>
                <div className="text-xs text-muted-foreground">Disponível para todas as empresas.</div>
              </div>
              <Switch
                checked={form.watch("isGlobal") ?? false}
                onCheckedChange={(v) => form.setValue("isGlobal", v)}
                disabled={!canToggleGlobal}
              />
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
