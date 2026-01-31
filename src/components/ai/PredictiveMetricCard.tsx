import { TrendingUp, TrendingDown, Minus, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { PredictiveMetric } from "@/data/mockAIData";

interface PredictiveMetricCardProps {
  metric: PredictiveMetric;
  horizon: '30d' | '90d' | '12m';
}

export function PredictiveMetricCard({ metric, horizon }: PredictiveMetricCardProps) {
  const getPredictedValue = () => {
    switch (horizon) {
      case '30d': return metric.valorPrevisto30d;
      case '90d': return metric.valorPrevisto90d;
      case '12m': return metric.valorPrevisto12m;
    }
  };

  const predictedValue = getPredictedValue();
  const isPercentage = metric.label.includes('Taxa');
  const change = ((predictedValue - metric.valorAtual) / metric.valorAtual) * 100;
  
  const formatValue = (value: number) => {
    if (isPercentage) return `${value.toFixed(1)}%`;
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  const TrendIcon = metric.tendencia === 'up' ? TrendingUp : metric.tendencia === 'down' ? TrendingDown : Minus;
  const isPositiveTrend = (metric.tendencia === 'up' && !metric.label.includes('Churn') && !metric.label.includes('Receber')) ||
                          (metric.tendencia === 'down' && (metric.label.includes('Churn') || metric.label.includes('Receber')));

  return (
    <div className="stat-card relative overflow-hidden">
      <div className="absolute top-2 right-2 opacity-10">
        <Brain className="w-16 h-16 text-primary" />
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          isPositiveTrend ? "bg-success/10" : "bg-warning/10"
        )}>
          <TrendIcon className={cn(
            "w-4 h-4",
            isPositiveTrend ? "text-success" : "text-warning"
          )} />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {metric.confianca}% confiança
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
      
      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Atual</p>
          <p className="text-lg font-semibold text-foreground">{formatValue(metric.valorAtual)}</p>
        </div>
        
        <div className={cn(
          "p-2 rounded-lg",
          isPositiveTrend ? "bg-success/5 border border-success/20" : "bg-warning/5 border border-warning/20"
        )}>
          <p className="text-xs text-muted-foreground">
            Previsão {horizon === '30d' ? '30 dias' : horizon === '90d' ? '90 dias' : '12 meses'}
          </p>
          <div className="flex items-center justify-between">
            <p className={cn(
              "text-xl font-bold",
              isPositiveTrend ? "text-success" : "text-warning"
            )}>
              {formatValue(predictedValue)}
            </p>
            <span className={cn(
              "text-sm font-medium",
              isPositiveTrend ? "text-success" : "text-warning"
            )}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
