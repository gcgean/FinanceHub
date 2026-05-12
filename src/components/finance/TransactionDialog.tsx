import { z } from "zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FinanceCategory, Transaction } from "@/api/finance"

const Schema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(["REVENUE", "EXPENSE"]),
  amount: z.coerce.number().positive(),
  status: z.enum(["NEW", "SUGGESTED", "PENDING", "APPROVED", "REVIEWED", "LOCKED"]),
  account: z.string().min(1),
  category: z.string().optional(),
})

export type TransactionFormValues = z.infer<typeof Schema>

export function TransactionDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: Transaction | null
  accounts: string[]
  categories: FinanceCategory[]
  loading?: boolean
  onSubmit: (values: TransactionFormValues) => Promise<void>
}) {
  const defaultValues = useMemo<TransactionFormValues>(
    () => ({
      date: new Date().toISOString().slice(0, 10),
      description: "",
      type: "EXPENSE",
      amount: 0,
      status: "NEW",
      account: props.accounts[0] ?? "",
      category: "",
    }),
    [props.accounts]
  )

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(Schema),
    defaultValues,
  })

  useEffect(() => {
    if (!props.open) return
    if (props.value) {
      form.reset({
        date: new Date(props.value.date).toISOString().slice(0, 10),
        description: props.value.description,
        type: props.value.type,
        amount: Math.abs(props.value.value),
        status: props.value.status,
        account: props.value.account,
        category: props.value.category ?? "",
      })
    } else {
      form.reset(defaultValues)
    }
  }, [defaultValues, form, props.open, props.value])

  const filteredCategories = useMemo(() => {
    const t = form.watch("type")
    return props.categories.filter((c) => c.active && c.type === t)
  }, [form, props.categories])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.value ? "Editar transação" : "Nova transação"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(async (values) => {
            await props.onSubmit(values)
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" {...form.register("date")} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v as TransactionFormValues["type"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REVENUE">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" placeholder="Ex.: Aluguel" {...form.register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input id="amount" type="number" step="0.01" min="0" {...form.register("amount")} />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as TransactionFormValues["status"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">Novo</SelectItem>
                  <SelectItem value="SUGGESTED">Sugerido</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="APPROVED">Aprovado</SelectItem>
                  <SelectItem value="REVIEWED">Revisado</SelectItem>
                  <SelectItem value="LOCKED">Travado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select value={form.watch("account")} onValueChange={(v) => form.setValue("account", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {props.accounts.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.watch("category") || "__none__"} onValueChange={(v) => form.setValue("category", v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(Sem categoria)</SelectItem>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

