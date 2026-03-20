import { useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listSales, createSale, updateSale, deleteSale, Sale } from "@/api/canonical"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Pencil, Trash2, Plus, Upload } from "lucide-react"
import { SalesDialog } from "./SalesDialog"
import { toast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { downloadXlsx } from "@/utils/xlsx"
import * as XLSX from "xlsx"

export function SalesTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [take, setTake] = useState(20)
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Sale | null>(null)
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const sales = useQuery({
    queryKey: ["canonical", "sales", { q: search, take, page }],
    queryFn: async () => listSales({ q: search, take, skip: page * take }),
  })

  const createMut = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      toast({ title: "Venda criada" })
      setOpen(false)
      qc.invalidateQueries({ queryKey: ["canonical", "sales"] })
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (data: Parameters<typeof updateSale>[1]) => updateSale(editing!.id, data),
    onSuccess: () => {
      toast({ title: "Venda atualizada" })
      setOpen(false)
      setEditing(null)
      qc.invalidateQueries({ queryKey: ["canonical", "sales"] })
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteSale,
    onSuccess: () => {
      toast({ title: "Venda excluída" })
      qc.invalidateQueries({ queryKey: ["canonical", "sales"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const items = sales.data?.items ?? []
  const total = sales.data?.total ?? 0

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Vendas</CardTitle>
            <div className="flex items-center gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-72" />
                <Button variant="outline" onClick={() => {
                    const salesHeaders = ["externalId", "date", "customerExternalId", "sellerExternalId", "cashierExternalId", "paymentMethodExternalId", "status"]
                    const salesRows: (string | number | null)[][] = [
                      ["1001", "2026-03-01T10:30:00", "200", "10", "3", "1", "OK"],
                      ["1002", "2026-03-01T11:15:00", "201", "11", "4", "2", "OK"],
                    ]
                    const itemsHeaders = ["saleExternalId", "itemExternalId", "productExternalId", "description", "quantity", "unitPrice"]
                    const itemsRows: (string | number | null)[][] = [
                      ["1001", "1", "300", "Produto A", 2, 10.5],
                      ["1001", "2", "301", "Produto B", 1, 5.0],
                      ["1002", "1", "300", "Produto A", 1, 10.5],
                    ]
                    const paymentsHeaders = ["saleExternalId", "paymentMethodExternalId", "paymentMethodName", "amount"]
                    const paymentsRows: (string | number | null)[][] = [
                      ["1001", "1", "Dinheiro", 26.0],
                      ["1002", "2", "Cartão", 10.5],
                    ]
                    const wb = XLSX.utils.book_new()
                    const wsSales = XLSX.utils.aoa_to_sheet([salesHeaders, ...salesRows])
                    const wsItems = XLSX.utils.aoa_to_sheet([itemsHeaders, ...itemsRows])
                    const wsPayments = XLSX.utils.aoa_to_sheet([paymentsHeaders, ...paymentsRows])
                    XLSX.utils.book_append_sheet(wb, wsSales, "Vendas")
                    XLSX.utils.book_append_sheet(wb, wsItems, "Itens")
                    XLSX.utils.book_append_sheet(wb, wsPayments, "Pagamentos")
                    XLSX.writeFile(wb, "modelo_vendas_itens_pagamentos.xlsx")
                }}>
                    <Download className="w-4 h-4 mr-2" />
                    Modelo XLSX
                </Button>
                <Button variant="outline" onClick={() => {
                    const headers = ["externalId", "date", "customer", "paymentMethod", "total", "status"]
                    const rows = items.map((sale) => [
                      sale.externalId ?? null,
                      sale.date,
                      sale.customer?.name ?? null,
                      sale.paymentMethod?.name ?? null,
                      sale.total,
                      sale.status ?? null,
                    ])
                    downloadXlsx("vendas.xlsx", headers, rows, "Vendas")
                }}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar XLSX
                </Button>
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar XLSX
                </Button>
                <Button onClick={() => { setEditing(null); setOpen(true) }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Venda
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Forma de Pagamento</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-24"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sales.isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-4">Carregando...</TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-4">Nenhuma venda encontrada</TableCell></TableRow>
                        ) : (
                            items.map((sale) => (
                                <TableRow key={sale.id}>
                                    <TableCell>{new Date(sale.date).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>{sale.customer?.name ?? "—"}</TableCell>
                                    <TableCell>
                                      {sale.payments?.length > 0 
                                        ? sale.payments.map(p => `${p.paymentMethod?.name ?? 'Não informado'} (${p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`).join(', ')
                                        : sale.paymentMethod?.name ?? "—"}
                                    </TableCell>
                                    <TableCell>{sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell>{sale.status}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditing(sale); setOpen(true) }}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteMut.mutate(sale.id)}>Excluir</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">Total: {total}</div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Anterior</Button>
                    <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * take >= total}>Próxima</Button>
                </div>
            </div>
        </CardContent>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".xlsx,.xls"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setImporting(true)
            try {
              const buf = await file.arrayBuffer()
              const wb = XLSX.read(buf, { type: "array" })
              const salesSheet = wb.Sheets["Vendas"]
              const itemsSheet = wb.Sheets["Itens"]
              const paymentsSheet = wb.Sheets["Pagamentos"]
              if (!salesSheet) {
                toast({ title: "Planilha inválida", description: "Aba Vendas não encontrada", variant: "destructive" })
                return
              }

              const salesRows: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(salesSheet, { defval: null })
              const itemsRows: Array<Record<string, unknown>> = itemsSheet ? XLSX.utils.sheet_to_json(itemsSheet, { defval: null }) : []
              const paymentsRows: Array<Record<string, unknown>> = paymentsSheet ? XLSX.utils.sheet_to_json(paymentsSheet, { defval: null }) : []

              const errors: string[] = []
              const saleMap = new Map<string, { data: Record<string, unknown>; items: Record<string, unknown>[]; payments: Record<string, unknown>[] }>()

              const toIso = (value: unknown) => {
                if (!value) return null
                if (value instanceof Date) return value.toISOString()
                if (typeof value === "number" && XLSX.SSF?.parse_date_code) {
                  const d = XLSX.SSF.parse_date_code(value)
                  if (d) {
                    const dt = new Date(d.y, d.m - 1, d.d, d.H, d.M, d.S)
                    return dt.toISOString()
                  }
                }
                const s = String(value).trim()
                if (!s) return null
                const dt = new Date(s)
                if (!isNaN(dt.getTime())) return dt.toISOString()
                return s
              }

              salesRows.forEach((row, idx) => {
                const rowIndex = idx + 2
                const externalId = String(row["externalId"] ?? "").trim()
                if (!externalId) {
                  errors.push(`Vendas linha ${rowIndex}: externalId obrigatório`)
                  return
                }
                const dateValue = toIso(row["date"])
                if (!dateValue) {
                  errors.push(`Vendas linha ${rowIndex}: date obrigatório`)
                  return
                }
                saleMap.set(externalId, {
                  data: {
                    externalId,
                    date: dateValue,
                    customerExternalId: row["customerExternalId"] ? String(row["customerExternalId"]).trim() : undefined,
                    sellerExternalId: row["sellerExternalId"] ? String(row["sellerExternalId"]).trim() : undefined,
                    cashierExternalId: row["cashierExternalId"] ? String(row["cashierExternalId"]).trim() : undefined,
                    paymentMethodExternalId: row["paymentMethodExternalId"] ? String(row["paymentMethodExternalId"]).trim() : undefined,
                    status: row["status"] ? String(row["status"]).trim() : undefined,
                  },
                  items: [],
                  payments: [],
                })
              })

              itemsRows.forEach((row, idx) => {
                const rowIndex = idx + 2
                const saleExternalId = String(row["saleExternalId"] ?? "").trim()
                if (!saleExternalId) {
                  errors.push(`Itens linha ${rowIndex}: saleExternalId obrigatório`)
                  return
                }
                const sale = saleMap.get(saleExternalId)
                if (!sale) {
                  errors.push(`Itens linha ${rowIndex}: venda ${saleExternalId} não encontrada na aba Vendas`)
                  return
                }
                const description = String(row["description"] ?? "").trim()
                const quantity = Number(row["quantity"] ?? 0)
                const unitPrice = Number(row["unitPrice"] ?? 0)
                if (!description) {
                  errors.push(`Itens linha ${rowIndex}: description obrigatório`)
                  return
                }
                if (!quantity || !unitPrice) {
                  errors.push(`Itens linha ${rowIndex}: quantity e unitPrice obrigatórios`)
                  return
                }
                sale.items.push({
                  id: row["itemExternalId"] ? String(row["itemExternalId"]).trim() : undefined,
                  productExternalId: row["productExternalId"] ? String(row["productExternalId"]).trim() : undefined,
                  description,
                  quantity,
                  unitPrice,
                })
              })

              paymentsRows.forEach((row, idx) => {
                const rowIndex = idx + 2
                const saleExternalId = String(row["saleExternalId"] ?? "").trim()
                if (!saleExternalId) {
                  errors.push(`Pagamentos linha ${rowIndex}: saleExternalId obrigatório`)
                  return
                }
                const sale = saleMap.get(saleExternalId)
                if (!sale) {
                  errors.push(`Pagamentos linha ${rowIndex}: venda ${saleExternalId} não encontrada na aba Vendas`)
                  return
                }
                const amount = Number(row["amount"] ?? 0)
                if (!amount) {
                  errors.push(`Pagamentos linha ${rowIndex}: amount obrigatório`)
                  return
                }
                sale.payments.push({
                  paymentMethodExternalId: row["paymentMethodExternalId"] ? String(row["paymentMethodExternalId"]).trim() : undefined,
                  paymentMethodName: row["paymentMethodName"] ? String(row["paymentMethodName"]).trim() : undefined,
                  amount,
                })
              })

              let created = 0
              for (const sale of saleMap.values()) {
                await createSale({
                  ...sale.data,
                  items: sale.items,
                  payments: sale.payments,
                })
                created++
              }

              toast({ title: "Importação concluída", description: `Vendas processadas: ${created}` })
              await qc.invalidateQueries({ queryKey: ["canonical", "sales"] })
              if (errors.length) {
                toast({ title: "Erros na importação", description: errors.slice(0, 8).join("\n"), variant: "destructive" })
              }
            } finally {
              setImporting(false)
              if (fileRef.current) fileRef.current.value = ""
            }
          }}
        />
        <SalesDialog 
            open={open} 
            onOpenChange={(v) => { setOpen(v); if(!v) setEditing(null) }} 
            value={editing}
            loading={createMut.isPending || updateMut.isPending}
            onSubmit={async (val) => {
                if (editing) {
                    await updateMut.mutateAsync(val)
                } else {
                    await createMut.mutateAsync(val)
                }
            }}
        />
    </Card>
  )
}
