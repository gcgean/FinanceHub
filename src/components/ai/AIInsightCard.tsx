import { AlertTriangle, Lightbulb, TrendingUp, Activity, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIInsightEvent } from "@/api/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AIInsightCardProps {
  insight: AIInsightEvent;
  onFeedback?: (id: string, type: 'USEFUL' | 'IRRELEVANT') => void;
}

export function AIInsightCard({ insight, onFeedback }: AIInsightCardProps) {
  const getIcon = () => {
    switch (insight.severity) {
      case 'CRITICAL':
      case 'HIGH': return AlertTriangle;
      case 'MEDIUM': return Activity;
      case 'LOW': return Lightbulb;
      default: return Lightbulb;
    }
  };

  const getVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (insight.severity) {
      case 'CRITICAL':
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'default';
      default: return 'outline';
    }
  };

  const Icon = getIcon();

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all hover:shadow-md",
      (insight.severity === 'CRITICAL' || insight.severity === 'HIGH') && "border-destructive/30 bg-destructive/5",
      insight.severity === 'MEDIUM' && "border-warning/30 bg-warning/5",
      insight.severity === 'LOW' && "border-primary/30 bg-primary/5"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          (insight.severity === 'CRITICAL' || insight.severity === 'HIGH') && "bg-destructive/10",
          insight.severity === 'MEDIUM' && "bg-warning/10",
          insight.severity === 'LOW' && "bg-primary/10"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            (insight.severity === 'CRITICAL' || insight.severity === 'HIGH') && "text-destructive",
            insight.severity === 'MEDIUM' && "text-warning",
            insight.severity === 'LOW' && "text-primary"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={getVariant()} className="text-xs">
              {insight.severity}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {insight.insightType}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(insight.occurredAt).toLocaleDateString()}
            </span>
          </div>

          <h4 className="font-semibold text-foreground mb-1">{insight.title}</h4>
          <p className="text-sm text-muted-foreground">{insight.summary}</p>

          {/* Ações de Feedback (Validação) */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => onFeedback?.(insight.id, 'IRRELEVANT')}
            >
              <ThumbsDown className="w-4 h-4 mr-1" />
              Não útil
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-muted-foreground hover:text-primary"
              onClick={() => onFeedback?.(insight.id, 'USEFUL')}
            >
              <ThumbsUp className="w-4 h-4 mr-1" />
              Útil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
