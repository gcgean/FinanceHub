import { Lightbulb, TrendingUp, RefreshCcw, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Opportunity } from "@/data/mockAIData";
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

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
}

export function OpportunitiesTable({ opportunities }: OpportunitiesTableProps) {
  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'upsell': return TrendingUp;
      case 'cross-sell': return Users;
      case 'retencao': return RefreshCcw;
      case 'expansao': return Lightbulb;
      default: return Lightbulb;
    }
  };

  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'upsell': return 'text-success bg-success/10';
      case 'cross-sell': return 'text-primary bg-primary/10';
      case 'retencao': return 'text-warning bg-warning/10';
      case 'expansao': return 'text-accent-foreground bg-accent';
    }
  };

  const totalPotencial = opportunities.reduce((sum, o) => sum + o.potencialReceita, 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-success" />
          <h3 className="font-semibold text-foreground">Oportunidades Identificadas</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Potencial total</p>
          <p className="text-lg font-bold text-success">
            R$ {totalPotencial.toLocaleString('pt-BR')}/mês
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Tipo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Produto/Oferta</TableHead>
            <TableHead>Potencial</TableHead>
            <TableHead>Probabilidade</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opportunity) => {
            const Icon = getTypeIcon(opportunity.tipo);
            return (
              <TableRow key={opportunity.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      getTypeColor(opportunity.tipo)
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {opportunity.tipo}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {opportunity.cliente}
                </TableCell>
                <TableCell>
                  <p className="text-sm text-foreground">{opportunity.produto}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={opportunity.acao}>
                    {opportunity.acao}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="font-semibold text-success">
                    +R$ {opportunity.potencialReceita.toLocaleString('pt-BR')}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success rounded-full" 
                        style={{ width: `${opportunity.probabilidade}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {opportunity.probabilidade}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{opportunity.prazo}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm">
                    Executar
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
