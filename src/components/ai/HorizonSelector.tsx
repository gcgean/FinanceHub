import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDays, CalendarRange } from "lucide-react";

interface HorizonSelectorProps {
  value: '30d' | '90d' | '12m';
  onChange: (value: '30d' | '90d' | '12m') => void;
}

export function HorizonSelector({ value, onChange }: HorizonSelectorProps) {
  const options = [
    { value: '30d' as const, label: '30 dias', icon: Calendar },
    { value: '90d' as const, label: '90 dias', icon: CalendarDays },
    { value: '12m' as const, label: '12 meses', icon: CalendarRange },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <Button
            key={option.value}
            variant={value === option.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onChange(option.value)}
            className={cn(
              "gap-2",
              value === option.value && "shadow-sm"
            )}
          >
            <Icon className="w-4 h-4" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
