import { AlertTriangle, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChurnRisk } from "@/data/mockAIData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ChurnRiskTableProps {
  risks: ChurnRisk[];
}

export function ChurnRiskTable({ risks }: ChurnRiskTableProps) {
  const getRiskColor = (risco: string) => {
    switch (risco) {
      case 'alto': return 'text-destructive bg-destructive/10';
      case 'medio': return 'text-warning bg-warning/10';
      case 'baixo': return 'text-success bg-success/10';
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="font-semibold text-foreground">Risco de Churn</h3>
        </div>
        <Badge variant="destructive">
          {risks.filter(r => r.risco === 'alto').length} críticos
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Valor Mensal</TableHead>
            <TableHead>Risco</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {risks.map((risk) => (
            <TableRow key={risk.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{risk.cliente}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {risk.diasAtraso}d atraso
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {risk.tipo}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                R$ {risk.valorMensal.toLocaleString('pt-BR')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge className={cn("capitalize", getRiskColor(risk.risco))}>
                    {risk.risco}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {risk.probabilidade}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="max-w-[200px]">
                <p className="text-sm text-muted-foreground truncate" title={risk.motivo}>
                  {risk.motivo}
                </p>
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline">
                  Reter
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
