import { AlertTriangle, Lightbulb, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIInsight } from "@/data/mockAIData";
import { Badge } from "@/components/ui/badge";

interface AIInsightCardProps {
  insight: AIInsight;
}

export function AIInsightCard({ insight }: AIInsightCardProps) {
  const getIcon = () => {
    switch (insight.tipo) {
      case 'alerta': return AlertTriangle;
      case 'oportunidade': return Lightbulb;
      case 'previsao': return TrendingUp;
      case 'tendencia': return Activity;
    }
  };

  const getVariant = () => {
    switch (insight.tipo) {
      case 'alerta': return 'destructive';
      case 'oportunidade': return 'default';
      case 'previsao': return 'secondary';
      case 'tendencia': return 'outline';
    }
  };

  const Icon = getIcon();
  const isPositive = insight.impacto > 0;

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all hover:shadow-md",
      insight.tipo === 'alerta' && "border-destructive/30 bg-destructive/5",
      insight.tipo === 'oportunidade' && "border-success/30 bg-success/5",
      insight.tipo === 'previsao' && "border-primary/30 bg-primary/5",
      insight.tipo === 'tendencia' && "border-warning/30 bg-warning/5"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          insight.tipo === 'alerta' && "bg-destructive/10",
          insight.tipo === 'oportunidade' && "bg-success/10",
          insight.tipo === 'previsao' && "bg-primary/10",
          insight.tipo === 'tendencia' && "bg-warning/10"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            insight.tipo === 'alerta' && "text-destructive",
            insight.tipo === 'oportunidade' && "text-success",
            insight.tipo === 'previsao' && "text-primary",
            insight.tipo === 'tendencia' && "text-warning"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={getVariant() as any} className="text-xs">
              {insight.tipo.charAt(0).toUpperCase() + insight.tipo.slice(1)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {insight.categoria}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {insight.confianca}% confiança
            </span>
          </div>

          <h4 className="font-semibold text-foreground mb-1">{insight.titulo}</h4>
          <p className="text-sm text-muted-foreground">{insight.descricao}</p>

          <div className="mt-3 flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Impacto estimado</p>
              <p className={cn(
                "text-lg font-bold",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {isPositive ? '+' : ''}R$ {Math.abs(insight.impacto).toLocaleString('pt-BR')}
                <span className="text-xs font-normal text-muted-foreground">/ano</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
