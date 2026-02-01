import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/utils/api"
import { useAuthStore } from "@/stores/authStore"

export type Company = {
  id: string
  name: string
  cnpj: string | null
}

export function useCompanyMe() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: ["companies", "me"],
    enabled: Boolean(token),
    queryFn: async () => {
      return apiFetch<{ company: Company | null }>("/companies/me")
    },
  })
}

export function useCompaniesList(enabled: boolean) {
  return useQuery({
    queryKey: ["companies", "list"],
    enabled,
    queryFn: async () => {
      return apiFetch<{ items: Company[] }>("/companies")
    },
  })
}

