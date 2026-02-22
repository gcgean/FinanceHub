import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export function IntegrationsTab() {
  const [erp, setErp] = useState("bling");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Mock data for sync status
  const lastSync = {
    date: new Date(),
    status: "Success",
  };

  const handleTestConnection = async () => {
    if (!erp || !apiUrl || !apiKey) {
      toast({ title: "Preencha todos os campos para testar a conexão.", variant: "destructive" });
      return;
    }
    setIsTesting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsTesting(false);
    toast({ title: "Conexão bem-sucedida!", description: "As credenciais são válidas." });
  };

  const handleSave = async () => {
    if (!erp || !apiUrl || !apiKey) {
      toast({ title: "Preencha todos os campos para salvar.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({ title: "Configurações salvas com sucesso!" });
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsSyncing(false);
    toast({ title: "Sincronização manual concluída!" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Integração com ERP</CardTitle>
          <CardDescription>Conecte seu sistema de gestão para sincronizar dados automaticamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="erp-select">Sistema ERP</Label>
            <Select value={erp} onValueChange={setErp}>
              <SelectTrigger id="erp-select">
                <SelectValue placeholder="Selecione o ERP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bling">Bling</SelectItem>
                <SelectItem value="tinyerp">TinyERP</SelectItem>
                <SelectItem value="sap">SAP</SelectItem>
                <SelectItem value="command">Command System</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-url">URL da API</Label>
            <Input
              id="api-url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.seu-erp.com/v2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">Chave de API (API Key / Token)</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="********************************"
            />
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleTestConnection} disabled={isTesting || isSaving || isSyncing}>
            {isTesting ? "Testando..." : "Testar Conexão"}
          </Button>
          <Button onClick={handleSave} disabled={isTesting || isSaving || isSyncing}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sincronização</CardTitle>
          <CardDescription>Acompanhe e gerencie a sincronização de dados.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Última Sincronização</p>
            <p className="text-sm text-muted-foreground">
              {lastSync.date.toLocaleString()} - <span className={lastSync.status === "Success" ? "text-green-600" : "text-red-600"}>{lastSync.status}</span>
            </p>
          </div>
          <Button onClick={handleSyncNow} disabled={isSyncing || isSaving}>
            {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
