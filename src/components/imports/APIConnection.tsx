import { useState } from "react";
import { Plus, Plug, Play, Pause, Settings, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { mockAPIEndpoints, type APIEndpoint } from "@/data/mockImportData";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function APIConnection() {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>(mockAPIEndpoints);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState<{
    name: string;
    url: string;
    method: 'GET' | 'POST';
    authType: 'bearer' | 'apikey' | 'basic' | 'none';
    schedule: 'manual' | 'hourly' | 'daily' | 'weekly';
  }>({
    name: '',
    url: '',
    method: 'GET',
    authType: 'bearer',
    schedule: 'daily',
  });

  const handleAddEndpoint = () => {
    const endpoint: APIEndpoint = {
      id: Math.random().toString(36).substr(2, 9),
      ...newEndpoint,
      status: 'inactive',
    };
    setEndpoints(prev => [...prev, endpoint]);
    setNewEndpoint({
      name: '',
      url: '',
      method: 'GET',
      authType: 'bearer',
      schedule: 'daily',
    });
    setIsAddingNew(false);
  };

  const toggleEndpoint = (id: string) => {
    setEndpoints(prev => 
      prev.map(ep => 
        ep.id === id 
          ? { ...ep, status: ep.status === 'active' ? 'inactive' : 'active' }
          : ep
      )
    );
  };

  const deleteEndpoint = (id: string) => {
    setEndpoints(prev => prev.filter(ep => ep.id !== id));
  };

  const runSync = (id: string) => {
    setEndpoints(prev => 
      prev.map(ep => 
        ep.id === id 
          ? { ...ep, lastRun: new Date().toISOString() }
          : ep
      )
    );
  };

  const scheduleLabels = {
    manual: 'Manual',
    hourly: 'A cada hora',
    daily: 'Diário',
    weekly: 'Semanal',
  };

  const authLabels = {
    bearer: 'Bearer Token',
    apikey: 'API Key',
    basic: 'Basic Auth',
    none: 'Sem autenticação',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Conexões de API</h3>
          <p className="text-sm text-muted-foreground">
            Configure integrações com outros sistemas
          </p>
        </div>
        <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conexão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Conexão de API</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome da Conexão</Label>
                <Input 
                  placeholder="Ex: ERP Empresa"
                  value={newEndpoint.name}
                  onChange={(e) => setNewEndpoint(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>URL do Endpoint</Label>
                <Input 
                  placeholder="https://api.example.com/transactions"
                  value={newEndpoint.url}
                  onChange={(e) => setNewEndpoint(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Método</Label>
                  <Select 
                    value={newEndpoint.method}
                    onValueChange={(value: 'GET' | 'POST') => setNewEndpoint(prev => ({ ...prev, method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Autenticação</Label>
                  <Select 
                    value={newEndpoint.authType}
                    onValueChange={(value: 'bearer' | 'apikey' | 'basic' | 'none') => setNewEndpoint(prev => ({ ...prev, authType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="apikey">API Key</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="none">Nenhuma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Frequência de Sincronização</Label>
                <Select 
                  value={newEndpoint.schedule}
                  onValueChange={(value: 'manual' | 'hourly' | 'daily' | 'weekly') => setNewEndpoint(prev => ({ ...prev, schedule: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="hourly">A cada hora</SelectItem>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAddEndpoint} 
                className="w-full"
                disabled={!newEndpoint.name || !newEndpoint.url}
              >
                Salvar Conexão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Endpoints List */}
      <div className="space-y-4">
        {endpoints.map(endpoint => (
          <Card key={endpoint.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                endpoint.status === 'active' ? "bg-success/10" : "bg-muted"
              )}>
                <Plug className={cn(
                  "w-5 h-5",
                  endpoint.status === 'active' ? "text-success" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">{endpoint.name}</h4>
                  <Badge 
                    variant={endpoint.status === 'active' ? 'default' : 'secondary'}
                    className={cn(
                      endpoint.status === 'active' && "bg-success/10 text-success hover:bg-success/20"
                    )}
                  >
                    {endpoint.status === 'active' ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Ativo</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" /> Inativo</>
                    )}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {endpoint.method} {endpoint.url}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {scheduleLabels[endpoint.schedule]}
                  </span>
                  <span>{authLabels[endpoint.authType]}</span>
                  {endpoint.lastRun && (
                    <span>
                      Última sync: {format(new Date(endpoint.lastRun), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => runSync(endpoint.id)}
                >
                  <Play className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleEndpoint(endpoint.id)}
                >
                  {endpoint.status === 'active' ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => deleteEndpoint(endpoint.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {endpoints.length === 0 && (
        <Card className="p-8 text-center">
          <Plug className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-foreground mb-2">Nenhuma conexão configurada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure integrações com seus sistemas para importar dados automaticamente
          </p>
          <Button onClick={() => setIsAddingNew(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Primeira Conexão
          </Button>
        </Card>
      )}
    </div>
  );
}
