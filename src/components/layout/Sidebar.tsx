import { 
  LayoutDashboard, 
  ArrowUpDown, 
  AlertCircle, 
  FileText, 
  Upload, 
  Settings, 
  Building2,
  LogOut,
  ChevronDown,
  Users,
  Brain,
  BookOpen,
  Folders
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useCompaniesList, useCompanyMe } from "@/hooks/useBackendQueries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "aiInsights", label: "Inteligência IA", icon: Brain },
  { id: "financialRegistrations", label: "Cadastros", icon: Folders },
  { id: "ledger", label: "Livro-caixa", icon: BookOpen },
  { id: "transactions", label: "Transações", icon: ArrowUpDown },
  { id: "pendencies", label: "Pendências", icon: AlertCircle },
  { id: "reports", label: "Relatórios", icon: FileText },
  { id: "imports", label: "Importações", icon: Upload },
];

const adminNavigation = [
  { id: "companies", label: "Empresas", icon: Building2 },
  { id: "users", label: "Usuários", icon: Users },
  { id: "settings", label: "Configurações", icon: Settings },
];

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const companyId = useAuthStore((s) => s.companyId)
  const setCompanyId = useAuthStore((s) => s.setCompanyId)
  const logout = useAuthStore((s) => s.logout)

  const isAdmin = user?.role === "ADMIN"
  const meCompany = useCompanyMe()
  const companies = useCompaniesList(Boolean(isAdmin))

  const selectedCompany = useMemo(() => {
    if (isAdmin) {
      const list = companies.data?.items ?? []
      return list.find((c) => c.id === companyId) ?? null
    }
    return meCompany.data?.company ?? null
  }, [companies.data?.items, companyId, isAdmin, meCompany.data?.company])

  const [search, setSearch] = useState("")
  const filteredCompanies = useMemo(() => {
    const list = companies.data?.items ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => c.name.toLowerCase().includes(q) || (c.cnpj ?? "").toLowerCase().includes(q))
  }, [companies.data?.items, search])

  const initials = useMemo(() => {
    const name = user?.name?.trim() ?? ""
    if (!name) return "??"
    const parts = name.split(/\s+/).filter(Boolean)
    const a = parts[0]?.[0] ?? "?"
    const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "?"
    return (a + b).toUpperCase()
  }, [user?.name])

  return (
    <aside className="w-64 bg-sidebar h-screen flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-lg">F</span>
          </div>
          <div>
            <h1 className="text-sidebar-foreground font-semibold text-lg">FinanceHub</h1>
            <p className="text-sidebar-muted text-xs">BPO Financeiro</p>
          </div>
        </div>
      </div>

      {/* Company Selector */}
      <div className="p-4 border-b border-sidebar-border">
        {isAdmin ? (
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-sidebar-primary/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-sidebar-primary" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium truncate">{selectedCompany?.name ?? "Selecionar empresa"}</p>
                    <p className="text-xs text-sidebar-muted truncate">{selectedCompany?.cnpj ? `CNPJ: ${selectedCompany.cnpj}` : "Defina o X-Company-Id"}</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-sidebar-muted" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Selecionar empresa</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou CNPJ..." />
                <ScrollArea className="h-80 rounded-md border">
                  <div className="p-2 space-y-2">
                    {companies.isLoading ? (
                      <div className="p-3 text-sm text-muted-foreground">Carregando...</div>
                    ) : filteredCompanies.length ? (
                      filteredCompanies.map((c) => (
                        <button
                          key={c.id}
                          className={cn(
                            "w-full flex items-center justify-between rounded-md px-3 py-2 text-left hover:bg-accent",
                            companyId === c.id && "bg-accent"
                          )}
                          onClick={() => setCompanyId(c.id)}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{c.cnpj ?? c.id}</div>
                          </div>
                          {companyId === c.id ? (
                            <div className="text-xs text-muted-foreground">Ativa</div>
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground">Nenhuma empresa encontrada.</div>
                    )}
                  </div>
                </ScrollArea>
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => setCompanyId(null)}>
                    Limpar empresa
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-sidebar-primary/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-sidebar-primary" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-medium truncate">{selectedCompany?.name ?? "Empresa"}</p>
                <p className="text-xs text-sidebar-muted truncate">{selectedCompany?.cnpj ? `CNPJ: ${selectedCompany.cnpj}` : ""}</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-sidebar-muted" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-sidebar-muted text-xs font-medium uppercase tracking-wider px-3 mb-3">
          Principal
        </p>
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={cn(
              "sidebar-item w-full",
              currentPage === item.id && "sidebar-item-active"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}

        <p className="text-sidebar-muted text-xs font-medium uppercase tracking-wider px-3 mt-6 mb-3">
          Administração
        </p>
        {adminNavigation.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={cn(
              "sidebar-item w-full",
              currentPage === item.id && "sidebar-item-active"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sidebar-foreground font-medium text-sm">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-sm font-medium truncate">{user?.name ?? "Usuário"}</p>
            <p className="text-sidebar-muted text-xs truncate">{user?.role ?? ""}</p>
          </div>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
