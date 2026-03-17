import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi, NotificationChannel } from "@/api/ai";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Mail, MessageSquare, Bell } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NotificationsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newChannelType, setNewChannelType] = useState<"EMAIL" | "WHATSAPP" | "TELEGRAM" | "IN_APP">("EMAIL");
  const [newTarget, setNewTarget] = useState("");

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['notification-channels'],
    queryFn: aiApi.getNotificationChannels,
  });

  const saveMutation = useMutation({
    mutationFn: aiApi.saveNotificationChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
      setIsAdding(false);
      setNewTarget("");
      toast({ title: "Canal salvo com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro ao salvar canal.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: aiApi.deleteNotificationChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
      toast({ title: "Canal removido." });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (channel: NotificationChannel) => 
      aiApi.saveNotificationChannel({ ...channel, enabled: !channel.enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    }
  });

  const handleAdd = () => {
    if (newChannelType !== "IN_APP" && !newTarget) {
      toast({ title: "Preencha o destino.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      type: newChannelType,
      target: newChannelType === "IN_APP" ? "Sistema" : newTarget,
      enabled: true,
    });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'EMAIL': return <Mail className="w-4 h-4" />;
      case 'WHATSAPP': return <MessageSquare className="w-4 h-4 text-green-600" />;
      case 'TELEGRAM': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getLabel = (type: string) => {
    switch(type) {
      case 'EMAIL': return "E-mail";
      case 'WHATSAPP': return "WhatsApp";
      case 'TELEGRAM': return "Telegram";
      case 'IN_APP': return "In-App (Sininho)";
      default: return type;
    }
  };

  if (isLoading) {
    return <div>Carregando canais...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Canais de Notificação</h3>
          <p className="text-sm text-muted-foreground">
            Configure onde você quer receber alertas do sistema e da IA.
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Canal
        </Button>
      </div>

      <div className="space-y-4">
        {channels.map((channel) => (
          <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {getIcon(channel.type)}
              <div>
                <p className="font-medium text-foreground">{getLabel(channel.type)}</p>
                {channel.type !== "IN_APP" && (
                  <p className="text-sm text-muted-foreground">{channel.target}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Switch 
                checked={channel.enabled} 
                onCheckedChange={() => toggleStatusMutation.mutate(channel)} 
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive"
                onClick={() => deleteMutation.mutate(channel.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {channels.length === 0 && !isAdding && (
          <div className="text-center p-6 border border-dashed rounded-lg text-muted-foreground">
            Nenhum canal configurado. Você receberá notificações In-App por padrão (se habilitado).
          </div>
        )}

        {isAdding && (
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <h4 className="font-medium">Novo Canal</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newChannelType} onValueChange={(v: any) => setNewChannelType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">E-mail</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="TELEGRAM">Telegram</SelectItem>
                    <SelectItem value="IN_APP">In-App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newChannelType !== "IN_APP" && (
                <div className="space-y-2">
                  <Label>Destino (ex: telefone ou email)</Label>
                  <Input 
                    value={newTarget} 
                    onChange={e => setNewTarget(e.target.value)} 
                    placeholder={newChannelType === "EMAIL" ? "seu@email.com" : "+5511999999999"}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancelar</Button>
              <Button onClick={handleAdd} disabled={saveMutation.isPending}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </div>

      <Separator className="my-6" />
      
      <div>
        <h4 className="font-semibold mb-4">Preferências de Alerta</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Insights Financeiros (IA)</p>
              <p className="text-sm text-muted-foreground">Receber alertas sobre anomalias no caixa, despesas, etc.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Pendências Vencidas</p>
              <p className="text-sm text-muted-foreground">Receber alertas de pendências aguardando ação</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>
    </Card>
  );
}