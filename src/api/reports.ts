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
