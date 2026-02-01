import { TrendingUp, TrendingDown, Wallet, AlertCircle, BookOpen, FileText, Folders } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { PendenciesWidget } from "@/components/dashboard/PendenciesWidget";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ClosingStatus } from "@/components/dashboard/ClosingStatus";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  return (
    <div className="p-6 space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Período selecionado</p>
          <p className="font-semibold text-foreground">Janeiro 2026</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Receita Total"
          value="R$ 261.000,00"
          change={12.5}
          changeLabel="vs. mês anterior"
          icon={TrendingUp}
          variant="positive"
        />
        <StatCard
          title="Despesas Total"
          value="R$ 186.000,00"
          change={-8.3}
          changeLabel="vs. mês anterior"
          icon={TrendingDown}
          variant="negative"
        />
        <StatCard
          title="Resultado"
          value="R$ 75.000,00"
          change={28.4}
          changeLabel="Margem: 28,7%"
          icon={Wallet}
          variant="positive"
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
          <RecentTransactions />
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
