import { useEffect } from "react"
import { useAuthStore } from "@/stores/authStore"
import Login from "@/pages/Login"

import type { ReactNode } from "react"

export function AuthGate({ children }: { children: ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated)
  const token = useAuthStore((s) => s.token)
  const hydrate = useAuthStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!token) return <Login />
  return <>{children}</>
}
