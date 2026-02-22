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
import type { ApTitle, Supplier, TitleStatus } from "@/api/canonical"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { useQuery } from "@tanstack/react-query"
import { listSuppliers } from "@/api/canonical"
import { listChartAccounts } from "@/api/finance"
import { DatePicker } from "@/components/ui/DatePicker"
import { LiveCurrencyInput } from "@/components/ui/LiveCurrencyInput"

const Schema = z.object({
  supplierId: z.string().optional().nullable(),
  chartAccountId: z.string().optional().nullable(),
  issueDate: z.string(),
  dueDate: z.string(),
  amount: z.number(),
  openAmount: z.number(),
  status: z.string(),
  documentNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  erpId: z.string().optional().nullable(),
})

export type ApTitleFormValues = z.infer<typeof Schema>

export function ApTitleDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: ApTitle | null
  loading?: boolean
  onSubmit: (values: ApTitleFormValues) => Promise<void>
}) {
  const defaultValues = useMemo<ApTitleFormValues>(
    () => ({
      supplierId: null,
      chartAccountId: null,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      amount: 0,
      openAmount: 0,
      status: "OPEN",
      documentNumber: null,
      notes: null,
      erpId: null,
    }),
    []
  )

  const form = useForm<ApTitleFormValues>({ resolver: zodResolver(Schema), defaultValues })

  useEffect(() => {
    if (!props.open) return
    if (props.value) {
      form.reset({
        supplierId: props.value.supplierId,
        chartAccountId: props.value.chartAccountId,
        issueDate: props.value.issueDate.slice(0, 10),
        dueDate: props.value.dueDate.slice(0, 10),
        amount: props.value.amount,
        openAmount: props.value.openAmount,
        status: props.value.status,
        documentNumber: props.value.documentNumber,
        notes: props.value.notes,
        erpId: props.value.erpId,
      })
    } else {
      form.reset(defaultValues)
    }
  }, [defaultValues, form, props.open, props.value])

  const [supplierSearch, setSupplierSearch] = React.useState("")
  const suppliers = useQuery({ queryKey: ["canonical", "suppliers", { q: supplierSearch }], queryFn: async () => listSuppliers({ q: supplierSearch }) })
  const supplierOptions = useMemo(() => suppliers.data?.items ?? [], [suppliers.data])
  const chart = useQuery({ queryKey: ["finance", "chartAccounts", "DESPESA"], queryFn: () => listChartAccounts({ revenueExpense: "DESPESA", planType: "ANALITICA" }) })
  const chartOptions = useMemo(() => chart.data ?? [], [chart.data])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.value ? "Editar Título" : "Novo Título"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(async (values) => {
            await props.onSubmit(values)
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={form.watch("supplierId") ?? ""} onValueChange={(v) => form.setValue("supplierId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {supplierOptions.map((s: Supplier) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Documento</Label>
              <Input placeholder="Nº do documento" {...form.register("documentNumber")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Plano de Contas</Label>
              <Select value={form.watch("chartAccountId") ?? ""} onValueChange={(v) => form.setValue("chartAccountId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {chartOptions.map((s) => (<SelectItem key={s.id} value={s.id}>{s.code} - {s.description}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as TitleStatus)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Aberto</SelectItem>
                  <SelectItem value="PAID">Pago</SelectItem>
                  <SelectItem value="OVERDUE">Vencido</SelectItem>
                  <SelectItem value="CANCELED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Código Lançamento ERP</Label>
              <Input placeholder="Digite o código do lançamento do ERP" {...form.register("erpId")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data de Emissão</Label>
              <DatePicker value={form.watch("issueDate")} onChange={(v) => form.setValue("issueDate", v)} />
            </div>
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <DatePicker value={form.watch("dueDate")} onChange={(v) => form.setValue("dueDate", v)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor</Label>
              <LiveCurrencyInput value={form.watch("amount")} onChange={(v) => form.setValue("amount", v)} />
            </div>
            <div className="space-y-2">
              <Label>Valor em Aberto</Label>
              <LiveCurrencyInput value={form.watch("openAmount")} onChange={(v) => form.setValue("openAmount", v)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Input placeholder="Observações" {...form.register("notes")} />
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
