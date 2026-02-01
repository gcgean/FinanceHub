import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { apiFetch, toQueryString } from "@/utils/api"
import { useAuthStore } from "@/stores/authStore"

describe("toQueryString", () => {
  it("should omit empty values", () => {
    const s = toQueryString({ a: "", b: null, c: undefined, d: 1 })
    expect(s).toBe("?d=1")
  })
})

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    useAuthStore.setState({ token: "t1", companyId: "c1" })
    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      const res = {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ gotAuth: headers.get("authorization"), gotCompany: headers.get("x-company-id") }),
      }
      return res as unknown as Response
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("should include auth and company headers", async () => {
    const res = await apiFetch<{ gotAuth: string | null; gotCompany: string | null }>("/health")
    expect(res.gotAuth).toBe("Bearer t1")
    expect(res.gotCompany).toBe("c1")
  })
})
