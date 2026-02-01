import { z } from "zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Account, ChartAccount, CostCenter } from "@/api/finance"
import type { LedgerEntry } from "@/api/ledger"

const Schema = z.object({
  issueDate: z.string().min(1),
  accountId: z.string().min(1),
  operation: z.enum(["DEBITO", "CREDITO"]),
  amount: z.coerce.number().positive(),
  history: z.string().optional(),
  confirmed: z.boolean().optional(),
  chartAccountId: z.string().min(1),
  costCenterId: z.string().optional(),
})

type FormValues = z.infer<typeof Schema>

function toDateInput(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function LedgerEntryDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: LedgerEntry | null
  accounts: Account[]
  chartAccounts: ChartAccount[]
  costCenters: CostCenter[]
  loading?: boolean
  onSubmit: (values: {
    issueDate: string
    accountId: string
    amount: number
    operation: "DEBITO" | "CREDITO"
    history?: string | null
    confirmed?: boolean
    splits: { chartAccountId: string; costCenterId?: string | null; splitAmount: number }[]
  }) => Promise<void>
}) {
  const defaultValues = useMemo<FormValues>(
    () => ({
      issueDate: toDateInput(new Date().toISOString()),
      accountId: "",
      operation: "CREDITO",
      amount: 0,
      history: "",
      confirmed: false,
      chartAccountId: "",
      costCenterId: "__none__",
    }),
    []
  )

  const form = useForm<FormValues>({ resolver: zodResolver(Schema), defaultValues })

  useEffect(() => {
    if (!props.open) return
    if (props.value) {
      const split = props.value.splits?.[0]
      form.reset({
        issueDate: toDateInput(props.value.issueDate),
        accountId: props.value.accountId ?? "",
        operation: props.value.operation,
        amount: props.value.amount,
        history: props.value.history ?? "",
        confirmed: props.value.confirmed,
        chartAccountId: split?.chartAccountId ?? "",
        costCenterId: split?.costCenterId ?? "__none__",
      })
    } else {
      form.reset(defaultValues)
    }
  }, [defaultValues, form, props.open, props.value])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.value ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(async (v) => {
            const splitAmount = v.amount
            const costCenterId = v.costCenterId && v.costCenterId !== "__none__" ? v.costCenterId : null
            await props.onSubmit({
              issueDate: v.issueDate,
              accountId: v.accountId,
              amount: v.amount,
              operation: v.operation,
              history: v.history || null,
              confirmed: v.confirmed ?? false,
              splits: [
                {
                  chartAccountId: v.chartAccountId,
                  costCenterId,
                  splitAmount,
                },
              ],
            })
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" {...form.register("issueDate")} />
            </div>
            <div className="space-y-2">
              <Label>Operação</Label>
              <Select value={form.watch("operation")} onValueChange={(v) => form.setValue("operation", v as FormValues["operation"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDITO">CREDITO</SelectItem>
                  <SelectItem value="DEBITO">DEBITO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input type="number" step="0.01" {...form.register("amount")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Histórico</Label>
            <Input placeholder="Recebimento PIX" {...form.register("history")} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select value={form.watch("accountId")} onValueChange={(v) => form.setValue("accountId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {props.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plano de contas</Label>
              <Select value={form.watch("chartAccountId")} onValueChange={(v) => form.setValue("chartAccountId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {props.chartAccounts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Centro de custo</Label>
              <Select value={form.watch("costCenterId") ?? ""} onValueChange={(v) => form.setValue("costCenterId", v)}>
                <SelectTrigger><SelectValue placeholder="(Opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(Nenhum)</SelectItem>
                  {props.costCenters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Confirmado</div>
              <div className="text-xs text-muted-foreground">Lançamentos confirmados exigem splits = valor.</div>
            </div>
            <Switch checked={form.watch("confirmed") ?? false} onCheckedChange={(v) => form.setValue("confirmed", v)} />
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
