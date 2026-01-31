import { AlertCircle, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Pendency {
  id: string;
  question: string;
  transactionDescription: string;
  type: "categorization" | "attachment" | "cost_center";
  sla: string;
  isOverdue: boolean;
}

const pendencies: Pendency[] = [
  {
    id: "1",
    question: "Qual a categoria desta transação?",
    transactionDescription: "TRANSF PIX JOSE MARIA - R$ 1.200,00",
    type: "categorization",
    sla: "Vence hoje",
    isOverdue: false,
  },
  {
    id: "2",
    question: "Anexe o comprovante de pagamento",
    transactionDescription: "Pagamento Fornecedor XYZ - R$ 8.500,00",
    type: "attachment",
    sla: "Venceu há 2 dias",
    isOverdue: true,
  },
  {
    id: "3",
    question: "Qual o centro de custo?",
    transactionDescription: "Material de Escritório - R$ 350,00",
    type: "cost_center",
    sla: "Vence em 3 dias",
    isOverdue: false,
  },
];

const typeLabels = {
  categorization: "Categorização",
  attachment: "Anexo",
  cost_center: "Centro de Custo",
};

export function PendenciesWidget() {
  const overdueCount = pendencies.filter(p => p.isOverdue).length;

  return (
    <div className="bg-card rounded-xl border border-border animate-fade-in">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Pendências</h3>
              <p className="text-sm text-muted-foreground">{pendencies.length} itens aguardando</p>
            </div>
          </div>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="animate-pulse-soft">
              {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="divide-y divide-border">
        {pendencies.map((pendency) => (
          <div key={pendency.id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-2 h-2 rounded-full mt-2",
                pendency.isOverdue ? "bg-destructive" : "bg-warning"
              )} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{pendency.question}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {pendency.transactionDescription}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {typeLabels[pendency.type]}
                  </Badge>
                  <span className={cn(
                    "text-xs flex items-center gap-1",
                    pendency.isOverdue ? "text-destructive" : "text-muted-foreground"
                  )}>
                    <Clock className="w-3 h-3" />
                    {pendency.sla}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-primary">
                Resolver
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full">
          Ver todas as pendências
        </Button>
      </div>
    </div>
  );
}