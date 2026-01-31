import { ArrowDownLeft, ArrowUpRight, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string;
  status: "approved" | "pending" | "suggested";
  type: "income" | "expense";
}

const transactions: Transaction[] = [
  {
    id: "1",
    description: "Pagamento Cliente ABC Ltda",
    category: "Receita de Serviços",
    value: 15000,
    date: "29/01/2026",
    status: "approved",
    type: "income",
  },
  {
    id: "2",
    description: "Aluguel do Escritório",
    category: "Despesas Fixas",
    value: -4500,
    date: "28/01/2026",
    status: "approved",
    type: "expense",
  },
  {
    id: "3",
    description: "TRANSF PIX JOSE MARIA",
    category: "",
    value: -1200,
    date: "28/01/2026",
    status: "pending",
    type: "expense",
  },
  {
    id: "4",
    description: "Licença Software SaaS",
    category: "Tecnologia",
    value: -899,
    date: "27/01/2026",
    status: "suggested",
    type: "expense",
  },
  {
    id: "5",
    description: "Venda Produto Premium",
    category: "Receita de Produtos",
    value: 8500,
    date: "27/01/2026",
    status: "approved",
    type: "income",
  },
];

const statusLabels = {
  approved: { label: "Aprovado", className: "badge-success" },
  pending: { label: "Pendente", className: "badge-pending" },
  suggested: { label: "Sugerido", className: "bg-primary/10 text-primary border-primary/20" },
};

export function RecentTransactions() {
  return (
    <div className="bg-card rounded-xl border border-border animate-fade-in">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Transações Recentes</h3>
          <p className="text-sm text-muted-foreground">Últimas movimentações do período</p>
        </div>
        <Button variant="outline" size="sm">Ver todas</Button>
      </div>

      <div className="divide-y divide-border">
        {transactions.map((tx) => (
          <div key={tx.id} className="data-table-row p-4 flex items-center gap-4">
            {/* Icon */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              tx.type === "income" ? "bg-success/10" : "bg-destructive/10"
            )}>
              {tx.type === "income" ? (
                <ArrowDownLeft className="w-5 h-5 text-success" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-destructive" />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{tx.description}</p>
              <p className="text-sm text-muted-foreground">
                {tx.category || <span className="italic">Sem categoria</span>}
              </p>
            </div>

            {/* Status */}
            <Badge variant="outline" className={cn("text-xs", statusLabels[tx.status].className)}>
              {statusLabels[tx.status].label}
            </Badge>

            {/* Value */}
            <div className="text-right w-28">
              <p className={cn(
                "font-mono font-semibold",
                tx.value > 0 ? "value-positive" : "value-negative"
              )}>
                {tx.value > 0 ? "+" : ""}{tx.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className="text-xs text-muted-foreground">{tx.date}</p>
            </div>

            {/* Actions */}
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}