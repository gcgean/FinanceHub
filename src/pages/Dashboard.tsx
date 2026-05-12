import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { endOfMonth, startOfMonth } from "date-fns";
import { TrendingUp, TrendingDown, Wallet, AlertCircle, BookOpen, FileText, Folders } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { PendenciesWidget } from "@/components/dashboard/PendenciesWidget";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ClosingStatus } from "@/components/dashboard/ClosingStatus";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFinanceHubSummary } from "@/api/finance";

export default function Dashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const period = useMemo(() => {
    const now = new Date()
    const from = startOfMonth(now)
    const to = endOfMonth(now)
    return {
      label: format(now, "MMMM yyyy", { locale: ptBR }),
      from: from.toISOString(),
      to: to.toISOString(),
    }
  }, [])

  const summary = useQuery({
    queryKey: ["financehub", "summary", { from: period.from, to: period.to }],
    queryFn: () => getFinanceHubSummary({ from: period.from, to: period.to }),
  })

  const revenue = summary.data?.revenue
  const expense = summary.data?.expense
  const net = summary.data?.net

  const currency = (v: number | undefined) =>
    v === undefined ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  return (
    <div className="p-6 space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Período selecionado</p>
          <p className="font-semibold text-foreground capitalize">{period.label}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Receita Total"
          value={currency(revenue)}
          icon={TrendingUp}
          variant="positive"
        />
        <StatCard
          title="Despesas Total"
          value={currency(expense)}
          icon={TrendingDown}
          variant="negative"
        />
        <StatCard
          title="Resultado"
          value={currency(net)}
          icon={Wallet}
          variant={net !== undefined && net < 0 ? "negative" : "positive"}
        />
        <StatCard
          title="Pendências"
          value="12"
          changeLabel="3 atrasadas"
          icon={AlertCircle}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart and Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <CashFlowChart />
          <RecentTransactions onNavigate={onNavigate} from={period.from} to={period.to} />
        </div>

        {/* Right Column - Pendencies and Closing */}
        <div className="space-y-6">
          <PendenciesWidget />
          <ClosingStatus />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Módulos financeiros</h3>
          <p className="text-xs text-muted-foreground">Acesso rápido aos módulos integrados ao backend.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Cadastros</div>
                <div className="text-xs text-muted-foreground">Contas, centros de custo e plano de contas.</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Folders className="w-5 h-5 text-primary" />
              </div>
            </div>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => onNavigate?.("financialRegistrations")}>
              Abrir
            </Button>
          </Card>
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Livro-caixa</div>
                <div className="text-xs text-muted-foreground">Lançamentos, confirmação e remoção.</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
            </div>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => onNavigate?.("ledger")}>
              Abrir
            </Button>
          </Card>
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Relatórios</div>
                <div className="text-xs text-muted-foreground">Extrato e DRE por período.</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => onNavigate?.("reports")}>
              Abrir
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
