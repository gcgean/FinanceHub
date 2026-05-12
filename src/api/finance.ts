import { apiFetch } from "@/utils/api"
import { toQueryString } from "@/utils/api"

export type AccountType = {
  id: string
  code: string
  description: string
  createdAt: string
}

export type Account = {
  id: string
  companyId: string
  code: string
  description: string
  externalCode: string | null
  active: boolean
  useInCashFlow: boolean
  superOnly: boolean
  defaultConfirmed: boolean
  accountTypeId: string | null
  createdAt: string
  typeDescription: string | null
  balance: number
}

export type CostCenter = {
  id: string
  companyId: string
  code: string
  externalCode: string | null
  description: string
  active: boolean
  createdAt: string
}

export type ChartAccount = {
  id: string
  companyId: string | null
  code: string
  description: string
  active: boolean
  isSuper: boolean
  planType: "SINTETICA" | "ANALITICA"
  parentId: string | null
  revenueExpense: "RECEITA" | "DESPESA"
  debitCredit: "DEBITO" | "CREDITO"
  fixedVariable: "FIXO" | "VARIAVEL"
  costExpense: "CUSTO" | "DESPESA"
  accountingCode: string | null
  dreHide: boolean
  dreGroupOtherFinIncome: boolean
  dreGroupDeductionsTaxes: boolean
  dreGroupInvestments: boolean
  dreGroupSalesMarketing: boolean
  dreGroupProfitSharing: boolean
  cashflowHide: boolean
  createdAt: string
}

export async function listAccountTypes() {
  return apiFetch<AccountType[]>("/accounts/types")
}

export async function listAccounts() {
  return apiFetch<Account[]>("/accounts")
}

export async function createAccount(body: {
  code?: string
  description: string
  externalCode?: string | null
  accountTypeId?: string | null
  active?: boolean
  useInCashFlow?: boolean
  superOnly?: boolean
  defaultConfirmed?: boolean
}) {
  return apiFetch<Account>("/accounts", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function updateAccount(id: string, body: Partial<Parameters<typeof createAccount>[0]>) {
  return apiFetch<Account>(`/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function deleteAccount(id: string) {
  return apiFetch<{ ok: true }>(`/accounts/${id}`, {
    method: "DELETE",
  })
}

export async function listCostCenters() {
  return apiFetch<CostCenter[]>("/cost-centers")
}

export async function createCostCenter(body: { code?: string; externalCode?: string | null; description: string; active?: boolean }) {
  return apiFetch<CostCenter>("/cost-centers", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function updateCostCenter(id: string, body: Partial<{ code: string; externalCode: string | null; description: string; active: boolean }>) {
  return apiFetch<CostCenter>(`/cost-centers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function deleteCostCenter(id: string) {
  return apiFetch<{ ok: true }>(`/cost-centers/${id}`, {
    method: "DELETE",
  })
}

export async function listChartAccounts(params?: {
  active?: boolean
  planType?: "SINTETICA" | "ANALITICA"
  revenueExpense?: "RECEITA" | "DESPESA"
  debitCredit?: "DEBITO" | "CREDITO"
  parentId?: string
  includeGlobal?: boolean
}) {
  return apiFetch<ChartAccount[]>(`/chart-accounts${toQueryString(params ?? {})}`)
}

export async function createChartAccount(body: {
  code?: string
  description: string
  active?: boolean
  isSuper?: boolean
  planType: "SINTETICA" | "ANALITICA"
  parentId?: string | null
  revenueExpense: "RECEITA" | "DESPESA"
  debitCredit: "DEBITO" | "CREDITO"
  fixedVariable: "FIXO" | "VARIAVEL"
  costExpense: "CUSTO" | "DESPESA"
  accountingCode?: string | null
  dreHide?: boolean
  dreGroupOtherFinIncome?: boolean
  dreGroupDeductionsTaxes?: boolean
  dreGroupInvestments?: boolean
  dreGroupSalesMarketing?: boolean
  dreGroupProfitSharing?: boolean
  cashflowHide?: boolean
  isGlobal?: boolean
}) {
  return apiFetch<ChartAccount>("/chart-accounts", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function updateChartAccount(id: string, body: Partial<Parameters<typeof createChartAccount>[0]>) {
  return apiFetch<ChartAccount>(`/chart-accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function deleteChartAccount(id: string) {
  return apiFetch<{ ok: true }>(`/chart-accounts/${id}`, {
    method: "DELETE",
  })
}

export async function deleteAllChartAccounts() {
  return apiFetch<{ count: number }>("/chart-accounts", {
    method: "DELETE",
  })
}

export type FinanceCategory = {
  id: string
  companyId: string
  name: string
  type: "REVENUE" | "EXPENSE"
  color: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export async function listCategories(params?: { type?: FinanceCategory["type"]; active?: boolean; search?: string }) {
  return apiFetch<FinanceCategory[]>(`/categories${toQueryString(params ?? {})}`)
}

export async function createCategory(body: { name: string; type: FinanceCategory["type"]; color?: string | null; active?: boolean }) {
  return apiFetch<FinanceCategory>("/categories", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function updateCategory(id: string, body: Partial<Parameters<typeof createCategory>[0]>) {
  return apiFetch<FinanceCategory>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function deleteCategory(id: string) {
  return apiFetch<{ ok: true }>(`/categories/${id}`, {
    method: "DELETE",
  })
}

export type Transaction = {
  id: string
  companyId: string
  date: string
  description: string
  value: number
  type: "REVENUE" | "EXPENSE"
  category: string
  categoryConfidence: number | null
  account: string
  status: "NEW" | "SUGGESTED" | "PENDING" | "APPROVED" | "REVIEWED" | "LOCKED"
  costCenter: string | null
  attachmentUrl: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type TransactionsListResponse = {
  items: Transaction[]
  total: number
  take: number
  skip: number
}

export async function listTransactions(params?: {
  take?: number
  skip?: number
  status?: Transaction["status"]
  type?: Transaction["type"]
  dateFrom?: string
  dateTo?: string
}) {
  return apiFetch<TransactionsListResponse>(`/transactions${toQueryString(params ?? {})}`)
}

export async function createTransaction(body: {
  date: string
  description: string
  value: number
  type: Transaction["type"]
  category: string
  categoryConfidence?: number | null
  account: string
  status: Transaction["status"]
  costCenter?: string | null
  attachmentUrl?: string | null
  notes?: string | null
  companyId?: string | null
}) {
  return apiFetch<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function updateTransaction(id: string, body: Partial<Parameters<typeof createTransaction>[0]>) {
  return apiFetch<Transaction>(`/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function deleteTransaction(id: string) {
  return apiFetch<{ ok: true }>(`/transactions/${id}`, {
    method: "DELETE",
  })
}

export type FinanceHubSummary = {
  from: string | null
  to: string | null
  revenue: number
  expense: number
  net: number
  counts: { revenue: number; expense: number }
}

export async function getFinanceHubSummary(params?: { from?: string; to?: string }) {
  return apiFetch<FinanceHubSummary>(`/financehub/summary${toQueryString(params ?? {})}`)
}

export async function getFinanceHubRecent(params?: { take?: number; from?: string; to?: string }) {
  return apiFetch<{ items: Transaction[] }>(`/financehub/recent${toQueryString(params ?? {})}`)
}
