import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInputPicker } from "@/components/ui/DateInputPicker"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import type { LedgerEntry } from "@/api/ledger"
import type { Account, ChartAccount, CostCenter } from "@/api/finance"

export type LedgerFormValues = {
  issueDate: string
  paymentDate: string
  accountId: string
  amount: string
  operation: "DEBITO" | "CREDITO"
  history: string
  confirmed: boolean
  splits: { chartAccountId: string; costCenterId: string; splitAmount: string }[]
}

function emptyForm(): LedgerFormValues {
  return {
    issueDate: new Date().toISOString().slice(0, 10),
    paymentDate: "",
    accountId: "",
    amount: "",
    operation: "DEBITO",
    history: "",
    confirmed: false,
    splits: [{ chartAccountId: "", costCenterId: "", splitAmount: "" }],
  }
}

export function LedgerDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: LedgerEntry | null
  accounts: Account[]
  chartAccounts: ChartAccount[]
  costCenters: CostCenter[]
  loading?: boolean
  onSubmit: (values: LedgerFormValues) => Promise<void>
}) {
  const [form, setForm] = useState<LedgerFormValues>(emptyForm)

  useEffect(() => {
    if (!props.open) return
    if (props.value) {
      const e = props.value
      setForm({
        issueDate: e.issueDate?.slice(0, 10) ?? "",
        paymentDate: e.paymentDate?.slice(0, 10) ?? "",
        accountId: e.accountId ?? "",
        amount: String(Math.abs(e.amount)),
        operation: e.operation,
        history: e.history ?? "",
        confirmed: e.confirmed,
        splits: e.splits?.length
          ? e.splits.map((s) => ({
              chartAccountId: s.chartAccountId,
              costCenterId: s.costCenterId ?? "",
              splitAmount: String(s.splitAmount),
            }))
          : [{ chartAccountId: "", costCenterId: "", splitAmount: "" }],
      })
    } else {
      setForm(emptyForm())
    }
  }, [props.open, props.value])

  function setField<K extends keyof LedgerFormValues>(key: K, value: LedgerFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setSplitField(index: number, key: keyof LedgerFormValues["splits"][0], value: string) {
    setForm((f) => {
      const splits = [...f.splits]
      splits[index] = { ...splits[index], [key]: value }
      return { ...f, splits }
    })
  }

  function addSplit() {
    setForm((f) => ({ ...f, splits: [...f.splits, { chartAccountId: "", costCenterId: "", splitAmount: "" }] }))
  }

  function removeSplit(index: number) {
    setForm((f) => ({ ...f, splits: f.splits.filter((_, i) => i !== index) }))
  }

  const analyticChartAccounts = props.chartAccounts.filter((c) => c.planType === "ANALITICA" && c.active)

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{props.value ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await props.onSubmit(form)
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data de emissão</Label>
              <DateInputPicker
                value={form.issueDate}
                onChange={(v) => setField("issueDate", v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de pagamento</Label>
              <DateInputPicker
                value={form.paymentDate}
                onChange={(v) => setField("paymentDate", v)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select value={form.accountId} onValueChange={(v) => setField("accountId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {props.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} — {a.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operação</Label>
              <Select value={form.operation} onValueChange={(v) => setField("operation", v as "DEBITO" | "CREDITO")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBITO">Débito</SelectItem>
                  <SelectItem value="CREDITO">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Histórico</Label>
            <Textarea
              placeholder="Descrição do lançamento..."
              value={form.history}
              onChange={(e) => setField("history", e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Confirmado</div>
              <div className="text-xs text-muted-foreground">Lançamentos confirmados afetam o saldo da conta.</div>
            </div>
            <Switch checked={form.confirmed} onCheckedChange={(v) => setField("confirmed", v)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rateios (Plano de Contas)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSplit}>
                <Plus className="w-3 h-3 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {form.splits.map((split, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center rounded-md border p-2">
                  <Select
                    value={split.chartAccountId}
                    onValueChange={(v) => setSplitField(i, "chartAccountId", v)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Plano de contas" />
                    </SelectTrigger>
                    <SelectContent>
                      {analyticChartAccounts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} — {c.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={split.costCenterId || "__none__"}
                    onValueChange={(v) => setSplitField(i, "costCenterId", v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Centro de custo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">(Sem centro de custo)</SelectItem>
                      {props.costCenters.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} — {c.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Valor"
                    className="w-28 text-xs"
                    value={split.splitAmount}
                    onChange={(e) => setSplitField(i, "splitAmount", e.target.value)}
                  />
                  {form.splits.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSplit(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
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
