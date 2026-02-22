import { apiFetch, toQueryString } from "@/utils/api"

export type State = { code: string; name: string }
export type City = { id: string; name: string; stateCode: string }

export async function listStates(params?: { search?: string }) {
  return apiFetch<State[]>(`/geo/states${toQueryString(params ?? {})}`)
}

export async function listCities(params: { state?: string; search?: string; take?: number; skip?: number }) {
  return apiFetch<{ items: City[]; total: number; take: number; skip: number }>(`/geo/cities${toQueryString(params)}`)
}
