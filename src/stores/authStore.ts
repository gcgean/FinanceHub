import { create } from "zustand"

export type AuthUser = {
  id: string
  email: string
  name: string
  role: "ADMIN" | "OPERATOR" | "CLIENT"
  companyId: string | null
}

type AuthState = {
  token: string | null
  user: AuthUser | null
  companyId: string | null
  hydrated: boolean
  setAuth: (params: { token: string; user: AuthUser }) => void
  setCompanyId: (companyId: string | null) => void
  logout: () => void
  hydrate: () => void
}

const STORAGE_KEY = "financehub_auth_v1"

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  companyId: null,
  hydrated: false,

  setAuth: ({ token, user }) => {
    set({ token, user, companyId: user.companyId, hydrated: true })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, companyId: user.companyId }))
  },

  setCompanyId: (companyId) => {
    set({ companyId })
    const { token, user } = get()
    if (token && user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, companyId }))
    }
  },

  logout: () => {
    set({ token: null, user: null, companyId: null, hydrated: true })
    localStorage.removeItem(STORAGE_KEY)
  },

  hydrate: () => {
    if (get().hydrated) return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      set({ hydrated: true })
      return
    }
    try {
      const parsed = JSON.parse(raw) as { token: string; user: AuthUser; companyId?: string | null }
      set({ token: parsed.token, user: parsed.user, companyId: parsed.companyId ?? parsed.user.companyId, hydrated: true })
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      set({ hydrated: true })
    }
  },
}))

