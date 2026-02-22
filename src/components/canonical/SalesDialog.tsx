import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { Sale, SaleItem, listCustomers, listPaymentMethods } from "@/api/canonical"
import { useQuery } from "@tanstack/react-query"
import { Trash2, Plus } from "lucide-react"

const ItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1, "Descrição obrigatória"),
  quantity: z.coerce.number().min(0.01, "Quantidade inválida"),
  unitPrice: z.coerce.number().min(0, "Preço inválido"),
})

const Schema = z.object({
  customerId: z.string().optional().nullable(),
  date: z.string().min(1, "Data obrigatória"),
  status: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  items: z.array(ItemSchema).default([]),
})

type FormValues = z.infer<typeof Schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: Sale | null
  onSubmit: (values: FormValues) => Promise<void>
  loading?: boolean
}

export function SalesDialog({ open, onOpenChange, value, onSubmit, loading }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      customerId: null,
      date: new Date().toISOString().split('T')[0],
      status: "COMPLETED",
      paymentMethodId: null,
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const customers = useQuery({
    queryKey: ["canonical", "customers", "list"],
    queryFn: async () => listCustomers({ take: 1000 }),
    enabled: open,
  })

  const paymentMethods = useQuery({
    queryKey: ["canonical", "payment-methods", "list"],
    queryFn: async () => listPaymentMethods({ take: 100 }),
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      form.reset({
        customerId: value?.customerId ?? null,
        date: value?.date ? new Date(value.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: value?.status ?? "COMPLETED",
        paymentMethodId: value?.paymentMethodId ?? null,
        items: value?.items.map(i => ({
          productId: i.productId,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })) ?? [],
      })
    }
  }, [open, value, form])

  const handleSubmit = async (data: FormValues) => {
    await onSubmit(data)
  }

  const total = form.watch("items").reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{value ? "Editar Venda" : "Nova Venda"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.data?.items.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pagamento</FormLabel>
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.data?.items.map((pm) => (
                          <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="COMPLETED">Concluída</SelectItem>
                        <SelectItem value="PENDING">Pendente</SelectItem>
                        <SelectItem value="CANCELED">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Itens</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
              
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-end">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="Descrição" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <FormControl>
                            <Input type="number" min="0.01" step="0.01" placeholder="Qtd" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem className="w-32">
                          <FormControl>
                            <Input type="number" min="0" step="0.01" placeholder="Preço" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="text-right font-medium">
                Total: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
