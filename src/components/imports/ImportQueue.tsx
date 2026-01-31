import { useState } from "react";
import { FileSpreadsheet, Image, Plug, CheckCircle, Clock, Loader2, AlertCircle, Eye, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mockPendingImports, type PendingImport } from "@/data/mockImportData";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ImportQueue() {
  const [imports, setImports] = useState<PendingImport[]>(mockPendingImports);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'analyzed'>('all');
  const [selectedImport, setSelectedImport] = useState<PendingImport | null>(null);

  const filteredImports = imports.filter(imp => 
    filter === 'all' || imp.status === filter
  );

  const statusCounts = {
    all: imports.length,
    pending: imports.filter(i => i.status === 'pending').length,
    processing: imports.filter(i => i.status === 'processing').length,
    analyzed: imports.filter(i => i.status === 'analyzed').length,
  };

  const getTypeIcon = (type: PendingImport['type']) => {
    switch (type) {
      case 'receipt': return Image;
      case 'excel': return FileSpreadsheet;
      case 'api': return Plug;
    }
  };

  const getStatusBadge = (status: PendingImport['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" /> Aguardando
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processando
          </Badge>
        );
      case 'analyzed':
        return (
          <Badge className="bg-success/10 text-success hover:bg-success/20">
            <CheckCircle className="w-3 h-3 mr-1" /> Analisado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" /> Erro
          </Badge>
        );
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const approveImport = (id: string) => {
    setImports(prev => prev.filter(i => i.id !== id));
    setSelectedImport(null);
  };

  const rejectImport = (id: string) => {
    setImports(prev => prev.filter(i => i.id !== id));
    setSelectedImport(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{statusCounts.all}</p>
          <p className="text-sm text-muted-foreground">Total na Fila</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-warning">{statusCounts.pending}</p>
          <p className="text-sm text-muted-foreground">Aguardando</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{statusCounts.processing}</p>
          <p className="text-sm text-muted-foreground">Processando</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-success">{statusCounts.analyzed}</p>
          <p className="text-sm text-muted-foreground">Prontos</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">Todos ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="pending">Aguardando ({statusCounts.pending})</TabsTrigger>
          <TabsTrigger value="processing">Processando ({statusCounts.processing})</TabsTrigger>
          <TabsTrigger value="analyzed">Analisados ({statusCounts.analyzed})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Queue List */}
      <div className="space-y-3">
        {filteredImports.map(imp => {
          const Icon = getTypeIcon(imp.type);
          return (
            <Card 
              key={imp.id} 
              className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => setSelectedImport(imp)}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  imp.type === 'receipt' ? "bg-primary/10" :
                  imp.type === 'excel' ? "bg-success/10" : "bg-warning/10"
                )}>
                  <Icon className={cn(
                    "w-6 h-6",
                    imp.type === 'receipt' ? "text-primary" :
                    imp.type === 'excel' ? "text-success" : "text-warning"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground truncate">{imp.fileName}</h4>
                    {getStatusBadge(imp.status)}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Por: {imp.uploadedBy}</span>
                    <span>
                      {format(new Date(imp.uploadedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                    {imp.aiAnalysis && (
                      <span className="text-success">
                        Confiança: {imp.aiAnalysis.confidence}%
                      </span>
                    )}
                  </div>
                </div>
                {imp.aiAnalysis && (
                  <div className="text-right">
                    <p className="font-medium text-foreground">
                      {formatCurrency(imp.aiAnalysis.suggestedValue)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {imp.aiAnalysis.suggestedCategory}
                    </p>
                  </div>
                )}
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredImports.length === 0 && (
        <Card className="p-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-success mb-4" />
          <h3 className="font-medium text-foreground mb-2">Fila vazia!</h3>
          <p className="text-sm text-muted-foreground">
            Não há itens {filter !== 'all' ? `com status "${filter}"` : ''} na fila de importação
          </p>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedImport} onOpenChange={() => setSelectedImport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Importação</DialogTitle>
          </DialogHeader>
          {selectedImport && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getTypeIcon(selectedImport.type);
                  return (
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center",
                      selectedImport.type === 'receipt' ? "bg-primary/10" :
                      selectedImport.type === 'excel' ? "bg-success/10" : "bg-warning/10"
                    )}>
                      <Icon className={cn(
                        "w-6 h-6",
                        selectedImport.type === 'receipt' ? "text-primary" :
                        selectedImport.type === 'excel' ? "text-success" : "text-warning"
                      )} />
                    </div>
                  );
                })()}
                <div>
                  <h4 className="font-medium text-foreground">{selectedImport.fileName}</h4>
                  <p className="text-sm text-muted-foreground">
                    Enviado por {selectedImport.uploadedBy} em{' '}
                    {format(new Date(selectedImport.uploadedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {selectedImport.aiAnalysis && (
                <Card className="p-4 bg-muted/50">
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Análise da IA
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categoria:</span>
                      <span className="font-medium text-foreground">{selectedImport.aiAnalysis.suggestedCategory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-medium text-foreground">{formatCurrency(selectedImport.aiAnalysis.suggestedValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium text-foreground">{selectedImport.aiAnalysis.suggestedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Descrição:</span>
                      <span className="font-medium text-foreground">{selectedImport.aiAnalysis.suggestedDescription}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confiança:</span>
                      <span className={cn(
                        "font-medium",
                        selectedImport.aiAnalysis.confidence >= 90 ? "text-success" :
                        selectedImport.aiAnalysis.confidence >= 70 ? "text-warning" : "text-destructive"
                      )}>
                        {selectedImport.aiAnalysis.confidence}%
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {selectedImport.status === 'analyzed' && (
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={() => approveImport(selectedImport.id)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Aprovar e Lançar
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => rejectImport(selectedImport.id)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              )}

              {selectedImport.status === 'pending' && (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aguardando processamento pela IA...
                  </p>
                </div>
              )}

              {selectedImport.status === 'processing' && (
                <div className="text-center py-4">
                  <Loader2 className="w-8 h-8 mx-auto text-primary mb-2 animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    IA está analisando o documento...
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
