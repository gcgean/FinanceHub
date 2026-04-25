import { apiFetch, toQueryString } from "@/utils/api"

export type LedgerSplit = {
  id: string
  entryId: string
  chartAccountId: string
  costCenterId: string | null
  splitAmount: number
  chartAccount?: { id: string; code: string; description: string }
  costCenter?: { id: string; code: string; description: string }
}

export type LedgerEntry = {
  id: string
  companyId: string
  code: number
  issueDate: string
  paymentDate: string | null
  accountId: string | null
  documentType: string | null
  documentNumber: string | null
  checkNumber: string | null
  entityCode: string | null
  amount: number
  operation: "DEBITO" | "CREDITO"
  history: string | null
  confirmed: boolean
  printOnClose: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  splits?: LedgerSplit[]
  account?: { id: string; code: string; description: string }
  chartAccountId?: string | null
  chartAccount?: { id: string; code: string; description: string } | null
  costCenterId?: string | null
  costCenter?: { id: string; code: string; description: string } | null
}

export async function listLedger(params: {
  dateFrom?: string
  dateTo?: string
  dateField?: "issueDate" | "paymentDate"
  accountId?: string
  operation?: "DEBITO" | "CREDITO"
  confirmed?: boolean
  deleted?: boolean
  withSplits?: boolean
} = {}) {
  return apiFetch<{ items: LedgerEntry[]; total: number; take: number; skip: number }>(`/ledger${toQueryString({ ...params, withSplits: params.withSplits ?? true })}`)
}

export async function createLedgerEntry(body: {
  issueDate: string
  paymentDate?: string | null
  accountId: string
  amount: number
  operation: "DEBITO" | "CREDITO"
  history?: string | null
  confirmed?: boolean
  printOnClose?: boolean
  splits: { chartAccountId: string; costCenterId?: string | null; splitAmount: number }[]
}) {
  return apiFetch<LedgerEntry>("/ledger", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function updateLedgerEntry(id: string, body: Parameters<typeof createLedgerEntry>[0]) {
  return apiFetch<LedgerEntry>(`/ledger/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export async function confirmLedgerEntry(id: string, confirmed: boolean) {
  return apiFetch<LedgerEntry>(`/ledger/${id}/confirm`, {
    method: "POST",
    body: JSON.stringify({ confirmed }),
  })
}

export async function deleteLedgerEntry(id: string) {
  return apiFetch<{ message: string }>(`/ledger/${id}`, {
    method: "DELETE",
  })
}

export type LedgerSplitRow = {
  id: string
  splitAmount: number
  chartAccount: { id: string; code: string; description: string }
  costCenter:   { id: string; code: string; description: string } | null
  entry: {
    id: string; code: number; issueDate: string; paymentDate: string | null
    history: string | null; operation: "DEBITO" | "CREDITO"
    confirmed: boolean; amount: number
    account: { id: string; code: string; description: string } | null
  }
}

export async function listLedgerSplits(params: {
  dateFrom?: string
  dateTo?: string
  dateField?: "issueDate" | "paymentDate"
  accountId?: string
  chartAccountId?: string
  take?: number
  skip?: number
} = {}) {
  return apiFetch<{ items: LedgerSplitRow[]; total: number; take: number; skip: number }>(
    `/ledger/splits${toQueryString(params)}`
  )
}
