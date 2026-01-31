import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  variant?: "default" | "positive" | "negative" | "warning";
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeLabel,
  icon: Icon,
  variant = "default" 
}: StatCardProps) {
  const isPositiveChange = change && change > 0;
  
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          variant === "positive" && "bg-success/10",
          variant === "negative" && "bg-destructive/10",
          variant === "warning" && "bg-warning/10",
          variant === "default" && "bg-primary/10"
        )}>
          <Icon className={cn(
            "w-6 h-6",
            variant === "positive" && "text-success",
            variant === "negative" && "text-destructive",
            variant === "warning" && "text-warning",
            variant === "default" && "text-primary"
          )} />
        </div>
        
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            isPositiveChange ? "text-success" : "text-destructive"
          )}>
            {isPositiveChange ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-sm mb-1">{title}</p>
      <p className={cn(
        "text-2xl font-bold",
        variant === "positive" && "value-positive",
        variant === "negative" && "value-negative"
      )}>
        {value}
      </p>
      
      {changeLabel && (
        <p className="text-muted-foreground text-xs mt-2">{changeLabel}</p>
      )}
    </div>
  );
}