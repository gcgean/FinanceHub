import { apiFetch, toQueryString } from "@/utils/api"

export type StatementItem = {
  id: string
  issueDate: string
  operation: "DEBITO" | "CREDITO"
  amount: number
  confirmed: boolean
  history: string | null
  balanceAfter: number | null
  accountDescription: string | null
}

export type StatementResponse = {
  items: StatementItem[]
  totals: {
    opening_balance: number
    inputs: number
    outputs: number
    closing_balance: number
    to_confirm_qty: number
    to_confirm_value: number
  }
}

export async function getStatement(params: {
  dateFrom?: string
  dateTo?: string
  accountId?: string
  operation?: "DEBITO" | "CREDITO"
  confirmed?: boolean
}) {
  return apiFetch<StatementResponse>(`/reports/statement${toQueryString(params)}`)
}

export type DreLine = {
  id: string
  code: string
  description: string
  revenueExpense: "RECEITA" | "DESPESA"
  parentId: string | null
  total: number
  value: number
  type: "GROUP" | "ACCOUNT" | "TOTAL"
}

export type DreResponse = {
  tabs: string[]
  listagem: DreLine[]
  indicadores: {
    receita_bruta: number
    lucro_liquido: number
    margem: number
  }
  indice_composicao: unknown[]
}

export async function runDre(body: { dateFrom: string; dateTo: string }) {
  return apiFetch<DreResponse>("/reports/dre/run", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export type ArSummaryItem = {
  customerId: string | null
  customerName: string
  knownName: string | null
  document: string | null
  daysAvg: number
  total: number
  percent: number
  percentAccum: number
  class: "A" | "B" | "C"
}

export type ArSummaryResponse = {
  items: ArSummaryItem[]
  totals: {
    totalGeral: number
    totalClientes: number
  }
}

export type ArDetailItem = {
  id: string
  externalId: string | null
  externalSeq: string | null
  customerId: string | null
  customerExternalId: string | null
  customerName: string
  knownName: string | null
  document: string | null
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  route: string | null
  issueDate: string
  dueDate: string
  paymentDate: string | null
  amount: number
  devolucao: number
  acrescimo: number
  valorLiquido: number
  openAmount: number
  paidAmount: number
  status: "OPEN" | "PAID" | "OVERDUE" | "CANCELED"
  documentNumber: string | null
  daysOverdue: number
  sellerName: string | null
}

export type ArDetailResponse = {
  items: ArDetailItem[]
  totals: {
    totalOpen: number
    totalTitulos: number
  }
}

export async function getAccountsReceivableSummary(params: {
  dateFrom?: string
  dateTo?: string
  dateField?: "issue" | "due"
  status?: "OPEN" | "PAID" | "OVERDUE" | "CANCELED"
  customerId?: string
  sellerId?: string
  route?: string
  indicator?: string
  q?: string
}) {
  return apiFetch<ArSummaryResponse>(`/reports/accounts-receivable/summary${toQueryString(params ?? {})}`)
}

export async function getAccountsReceivableDetail(params: {
  dateFrom?: string
  dateTo?: string
  dateField?: "issue" | "due"
  status?: "OPEN" | "PAID" | "OVERDUE" | "CANCELED"
  customerId?: string
  sellerId?: string
  route?: string
  indicator?: string
  q?: string
}) {
  return apiFetch<ArDetailResponse>(`/reports/accounts-receivable/detail${toQueryString(params ?? {})}`)
}
