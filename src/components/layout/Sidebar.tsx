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
  Brain
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "aiInsights", label: "Inteligência IA", icon: Brain },
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
        <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-sidebar-primary/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-sidebar-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Tech Solutions Ltda</p>
              <p className="text-xs text-sidebar-muted">CNPJ: 12.345.678/0001-90</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-sidebar-muted" />
        </button>
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
            <span className="text-sidebar-foreground font-medium text-sm">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-sm font-medium truncate">João da Silva</p>
            <p className="text-sidebar-muted text-xs truncate">BPO Operador</p>
          </div>
          <button className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}