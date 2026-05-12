import { useMemo, useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { ApiResponseError, apiFetch, getApiBaseUrl } from "@/utils/api"
import { useAuthStore, type AuthUser } from "@/stores/authStore"

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type LoginForm = z.infer<typeof LoginSchema>

export default function Login() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const defaults = useMemo(
    () => ({ email: "admin@financehub.local", password: "admin123" }),
    []
  )

  const form = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: defaults,
  })

  const onSubmit = async (values: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      const res = await apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      })
      setAuth({ token: res.token, user: res.user })
    } catch (e: unknown) {
      if (e instanceof ApiResponseError && e.status === 0) {
        setError(
          `Não foi possível conectar ao backend (${getApiBaseUrl()}). Inicie o backend e o Postgres, ou ajuste VITE_API_URL.`
        )
        return
      }
      if (e instanceof ApiResponseError && e.status >= 500) {
        const code = String(e.code ?? "")
        const looksLikeDbDown =
          code.includes("Can't reach database server") ||
          code.includes("ECONNREFUSED") ||
          code.includes("P1001")
        if (looksLikeDbDown) {
          setError(
            "Backend respondeu, mas o banco não está acessível. Inicie o Postgres (Docker Desktop/daemon precisa estar rodando) e rode as migrations/seed."
          )
          return
        }
      }
      const msg = e instanceof Error ? e.message : "Falha ao entrar"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>Conecte-se ao backend para usar os módulos financeiros.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive" className="text-sm">
                {error}
              </Alert>
            ) : null}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" {...form.register("email")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} {...form.register("password")} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
