import { apiFetch } from "@/utils/api"
export type Company = {
  id: string
  name: string
  cnpj: string | null
  email: string | null
  phone: string | null
  plan: "BASIC" | "PROFESSIONAL" | "ENTERPRISE"
  status: "ACTIVE" | "INACTIVE" | "PENDING"
}

export async function listCompanies() {
  return apiFetch<{ items: (Company & { transactionsMonth: number; pendenciesOpen: number })[]; total: number; take: number; skip: number }>("/companies")
}

export async function createCompany(body: { name: string; cnpj?: string | null; email?: string | null; phone?: string | null; plan?: "BASIC" | "PROFESSIONAL" | "ENTERPRISE"; status?: "ACTIVE" | "INACTIVE" | "PENDING" }) {
  return apiFetch<Company>("/companies", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function updateCompany(id: string, body: { name: string; cnpj?: string | null; email?: string | null; phone?: string | null; plan?: "BASIC" | "PROFESSIONAL" | "ENTERPRISE"; status?: "ACTIVE" | "INACTIVE" | "PENDING" }) {
  return apiFetch<Company>(`/companies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function deleteCompany(id: string) {
  return apiFetch<{ ok: true }>(`/companies/${id}`, {
    method: "DELETE",
  })
}
