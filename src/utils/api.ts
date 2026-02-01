import { useAuthStore } from "@/stores/authStore"

export type ApiError = {
  status: number
  code: string
}

export class ApiResponseError extends Error {
  status: number
  code: string

  constructor(params: ApiError) {
    super(params.code)
    this.status = params.status
    this.code = params.code
  }
}

function getBaseUrl() {
  const url = import.meta.env.VITE_API_URL as string | undefined
  return url?.trim() ? url.trim().replace(/\/$/, "") : "http://127.0.0.1:4000"
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl()
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`

  const { token, companyId } = useAuthStore.getState()
  const headers = new Headers(init?.headers)
  if (!headers.has("content-type") && init?.body) headers.set("content-type", "application/json")
  if (token) headers.set("authorization", `Bearer ${token}`)
  if (companyId) headers.set("x-company-id", companyId)

  const res = await fetch(url, {
    ...init,
    headers,
  })

  const contentType = res.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const payload: unknown = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "")

  if (!res.ok) {
    const code =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `HTTP_${res.status}`
    throw new ApiResponseError({ status: res.status, code })
  }
  return payload as T
}

export function toQueryString(params: Record<string, string | number | boolean | undefined | null>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue
    qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `?${s}` : ""
}
