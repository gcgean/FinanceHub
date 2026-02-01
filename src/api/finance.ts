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

export async function listCostCenters() {
  return apiFetch<CostCenter[]>("/cost-centers")
}

export async function createCostCenter(body: { code: string; description: string; active?: boolean }) {
  return apiFetch<CostCenter>("/cost-centers", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function updateCostCenter(id: string, body: Partial<{ code: string; description: string; active: boolean }>) {
  return apiFetch<CostCenter>(`/cost-centers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
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

