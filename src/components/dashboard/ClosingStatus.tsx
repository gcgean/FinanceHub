import { CheckCircle2, Circle, Lock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

const checklistItems: ChecklistItem[] = [
  { id: "1", label: "Extratos importados de todas as contas", completed: true },
  { id: "2", label: "Transações categorizadas", completed: true },
  { id: "3", label: "Pendências resolvidas", completed: false },
  { id: "4", label: "Conciliação bancária", completed: false },
  { id: "5", label: "DRE revisada", completed: false },
  { id: "6", label: "Fluxo de caixa conferido", completed: false },
];

export function ClosingStatus() {
  const completedCount = checklistItems.filter((item) => item.completed).length;
  const progress = (completedCount / checklistItems.length) * 100;

  return (
    <div className="bg-card rounded-xl border border-border animate-fade-in">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Fechamento Mensal</h3>
              <p className="text-sm text-muted-foreground">Janeiro 2026</p>
            </div>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount}/{checklistItems.length}
          </span>
        </div>

        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {progress < 100 
            ? `${(100 - progress).toFixed(0)}% restante para fechar o mês`
            : "Pronto para fechamento!"
          }
        </p>
      </div>

      <div className="p-4 space-y-3">
        {checklistItems.map((item) => (
          <div 
            key={item.id} 
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors",
              item.completed && "bg-success/5"
            )}
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={cn(
              "text-sm",
              item.completed ? "text-muted-foreground line-through" : "text-foreground"
            )}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <Button 
          className="w-full" 
          disabled={progress < 100}
        >
          <Lock className="w-4 h-4 mr-2" />
          Travar Mês
        </Button>
      </div>
    </div>
  );
}