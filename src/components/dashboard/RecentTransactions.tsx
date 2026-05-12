import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getFinanceHubRecent, type Transaction } from "@/api/finance";

const statusLabels: Record<Transaction["status"], { label: string; className: string }> = {
  NEW: { label: "Novo", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  SUGGESTED: { label: "Sugerido", className: "bg-primary/10 text-primary border-primary/20" },
  PENDING: { label: "Pendente", className: "badge-pending" },
  APPROVED: { label: "Aprovado", className: "badge-success" },
  REVIEWED: { label: "Revisado", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  LOCKED: { label: "Travado", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

export function RecentTransactions(props: {
  onNavigate?: (page: string) => void
  from?: string
  to?: string
}) {
  const recent = useQuery({
    queryKey: ["financehub", "recent", { from: props.from, to: props.to }],
    queryFn: () => getFinanceHubRecent({ take: 6, from: props.from, to: props.to }),
  })

  const items = recent.data?.items ?? []

  return (
    <div className="bg-card rounded-xl border border-border animate-fade-in">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Transações Recentes</h3>
          <p className="text-sm text-muted-foreground">Últimas movimentações do período</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => props.onNavigate?.("transactions")}>Ver todas</Button>
      </div>

      <div className="divide-y divide-border">
        {recent.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
        ) : items.length ? (
          items.map((tx) => (
            <div key={tx.id} className="data-table-row p-4 flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                tx.value >= 0 ? "bg-success/10" : "bg-destructive/10"
              )}>
                {tx.value >= 0 ? (
                  <ArrowDownLeft className="w-5 h-5 text-success" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-destructive" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{tx.description}</p>
                <p className="text-sm text-muted-foreground">
                  {tx.category ? tx.category : <span className="italic">Sem categoria</span>}
                </p>
              </div>

              <Badge variant="outline" className={cn("text-xs", statusLabels[tx.status].className)}>
                {statusLabels[tx.status].label}
              </Badge>

              <div className="text-right w-32">
                <p className={cn(
                  "font-mono font-semibold",
                  tx.value >= 0 ? "value-positive" : "value-negative"
                )}>
                  {tx.value >= 0 ? "+" : "-"}{Math.abs(tx.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Nenhuma transação recente.</div>
        )}
      </div>
    </div>
  );
}
