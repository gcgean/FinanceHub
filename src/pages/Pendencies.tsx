import { useState } from "react";
import { 
  Clock, AlertCircle, CheckCircle, MessageSquare, 
  Filter, Search, ChevronRight, Upload, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  mockPendencies, 
  pendencyTypeLabels, 
  pendencyPriorityLabels,
  type Pendency,
  type PendencyStatus 
} from "@/data/mockPendenciesData";
import { categories, costCenters } from "@/data/mockTransactionsData";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Pendencies() {
  const [pendencies, setPendencies] = useState<Pendency[]>(mockPendencies);
  const [statusFilter, setStatusFilter] = useState<PendencyStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPendency, setSelectedPendency] = useState<Pendency | null>(null);
  const [response, setResponse] = useState("");

  const filteredPendencies = pendencies.filter(p => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesStatus && matchesType;
  });

  const statusCounts = {
    all: pendencies.length,
    pending: pendencies.filter(p => p.status === 'pending').length,
    overdue: pendencies.filter(p => p.status === 'overdue').length,
    in_progress: pendencies.filter(p => p.status === 'in_progress').length,
    resolved: pendencies.filter(p => p.status === 'resolved').length,
  };

  const getStatusBadge = (status: PendencyStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Atrasado</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><MessageSquare className="w-3 h-3 mr-1" /> Em andamento</Badge>;
      case 'resolved':
        return <Badge className="bg-success/10 text-success"><CheckCircle className="w-3 h-3 mr-1" /> Resolvido</Badge>;
    }
  };

  const getPriorityBadge = (priority: Pendency['priority']) => {
    const colors = {
      high: 'bg-destructive/10 text-destructive',
      medium: 'bg-warning/10 text-warning',
      low: 'bg-muted text-muted-foreground',
    };
    return <Badge className={colors[priority]}>{pendencyPriorityLabels[priority]}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const resolvePendency = (id: string, responseText: string) => {
    setPendencies(prev => 
      prev.map(p => 
        p.id === id 
          ? { ...p, status: 'resolved' as const, resolvedAt: new Date().toISOString(), response: responseText }
          : p
      )
    );
    setSelectedPendency(null);
    setResponse("");
  };

  const getSLAInfo = (dueAt: string) => {
    const now = new Date();
    const due = new Date(dueAt);
    const isOverdue = now > due;
    const distance = formatDistanceToNow(due, { locale: ptBR, addSuffix: true });
    return { isOverdue, distance };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Pendências</h2>
        <p className="text-muted-foreground">
          Itens aguardando resolução do cliente ou operador
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{statusCounts.overdue}</p>
              <p className="text-xs text-muted-foreground">Atrasadas</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{statusCounts.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{statusCounts.in_progress}</p>
              <p className="text-xs text-muted-foreground">Em andamento</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{statusCounts.resolved}</p>
              <p className="text-xs text-muted-foreground">Resolvidas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList>
            <TabsTrigger value="all">Todas ({statusCounts.all})</TabsTrigger>
            <TabsTrigger value="overdue" className="text-destructive">Atrasadas ({statusCounts.overdue})</TabsTrigger>
            <TabsTrigger value="pending">Pendentes ({statusCounts.pending})</TabsTrigger>
            <TabsTrigger value="resolved">Resolvidas ({statusCounts.resolved})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(pendencyTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pendencies List */}
      <div className="space-y-3">
        {filteredPendencies.map(pendency => {
          const sla = getSLAInfo(pendency.dueAt);
          return (
            <Card 
              key={pendency.id} 
              className={cn(
                "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                pendency.status === 'overdue' && "border-destructive/50"
              )}
              onClick={() => setSelectedPendency(pendency)}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-2",
                  pendency.status === 'overdue' ? "bg-destructive" :
                  pendency.status === 'pending' ? "bg-warning" :
                  pendency.status === 'in_progress' ? "bg-primary" : "bg-success"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{pendency.question}</p>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {pendency.transactionDescription} • {formatCurrency(pendency.transactionValue)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(pendency.status)}
                      {getPriorityBadge(pendency.priority)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <Badge variant="outline">{pendencyTypeLabels[pendency.type]}</Badge>
                    <span>Atribuído: {pendency.assignedTo}</span>
                    <span className={cn(sla.isOverdue && "text-destructive font-medium")}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {sla.isOverdue ? 'Venceu' : 'Vence'} {sla.distance}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPendencies.length === 0 && (
        <Card className="p-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-success mb-4" />
          <h3 className="font-medium text-foreground mb-2">Nenhuma pendência encontrada</h3>
          <p className="text-sm text-muted-foreground">
            Todas as pendências foram resolvidas ou não há itens com o filtro selecionado.
          </p>
        </Card>
      )}

      {/* Resolution Dialog */}
      <Dialog open={!!selectedPendency} onOpenChange={() => setSelectedPendency(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolver Pendência</DialogTitle>
          </DialogHeader>
          {selectedPendency && (
            <div className="space-y-4">
              <Card className="p-4 bg-muted/50">
                <p className="font-medium text-foreground mb-2">{selectedPendency.question}</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Transação: {selectedPendency.transactionDescription}</p>
                  <p>Valor: {formatCurrency(selectedPendency.transactionValue)}</p>
                  <p>Tipo: {pendencyTypeLabels[selectedPendency.type]}</p>
                </div>
              </Card>

              {selectedPendency.status === 'resolved' ? (
                <Card className="p-4 bg-success/5 border-success/20">
                  <div className="flex items-center gap-2 text-success mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Resolvido</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedPendency.response}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Por {selectedPendency.resolvedBy} em {format(new Date(selectedPendency.resolvedAt!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </Card>
              ) : (
                <>
                  {selectedPendency.type === 'categorization' && (
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedPendency.type === 'cost_center' && (
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o centro de custo" />
                      </SelectTrigger>
                      <SelectContent>
                        {costCenters.map(cc => (
                          <SelectItem key={cc} value={cc}>{cc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedPendency.type === 'attachment' && (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clique ou arraste para enviar o arquivo
                      </p>
                      <Button variant="outline" className="mt-3">
                        Selecionar Arquivo
                      </Button>
                    </div>
                  )}

                  {(selectedPendency.type === 'approval' || selectedPendency.type === 'review') && (
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        onClick={() => resolvePendency(selectedPendency.id, 'Aprovado')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setSelectedPendency(null)}
                      >
                        Rejeitar
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Observações (opcional)</label>
                    <Textarea 
                      placeholder="Adicione uma observação..."
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                    />
                  </div>

                  {selectedPendency.type !== 'approval' && selectedPendency.type !== 'review' && (
                    <Button 
                      className="w-full" 
                      onClick={() => resolvePendency(selectedPendency.id, response || 'Resolvido pelo operador')}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Resposta
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
