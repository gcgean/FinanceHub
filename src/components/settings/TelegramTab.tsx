import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Link, Unlink, RefreshCw, Send, Copy, Check, ExternalLink, Loader2, Bot, Plus, Trash2, Pencil, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { telegramApi, type LinkCodeResponse } from "@/api/telegram";
import { telegramBotsApi, type TelegramBot, type CreateBotPayload } from "@/api/telegram-bots";

// ── BotDialog ─────────────────────────────────────────────────────────────────

type BotDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateBotPayload & { id?: string }) => void;
  saving: boolean;
  bot?: TelegramBot | null;
};

function BotDialog({ open, onClose, onSave, saving, bot }: BotDialogProps) {
  const isEdit = !!bot;
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [testChatId, setTestChatId] = useState("");

  useEffect(() => {
    if (bot) {
      setName(bot.name);
      setUsername(bot.username ?? "");
      setToken("");      // token nunca é pré-preenchido por segurança
    } else {
      setName("");
      setUsername("");
      setToken("");
    }
    setTestChatId("");
  }, [bot, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    if (!isEdit && !token.trim()) return;
    onSave({
      ...(bot ? { id: bot.id } : {}),
      name: name.trim(),
      username: username.trim() || null,
      ...(token.trim() ? { token: token.trim() } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Bot" : "Adicionar Bot do Telegram"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome amigável</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: @GestorFacilBot" />
          </div>
          <div className="space-y-1.5">
            <Label>Username do bot <span className="text-muted-foreground text-xs">(sem @, opcional)</span></Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ex: GestorFacilBot" />
          </div>
          <div className="space-y-1.5">
            <Label>
              Token do BotFather
              {isEdit && <span className="text-muted-foreground text-xs ml-2">(deixe em branco para não alterar)</span>}
            </Label>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Ex: 1234567890:AAFxxx..."
              type="password"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Obtenha o token em <strong>@BotFather</strong> → /mybots → API Token.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || (!isEdit && !token.trim())}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Salvar" : "Adicionar Bot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── TelegramTab ───────────────────────────────────────────────────────────────

export function TelegramTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [linkData, setLinkData] = useState<LinkCodeResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Bot management state
  const [botDialogOpen, setBotDialogOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<TelegramBot | null>(null);
  const [testChatIdMap, setTestChatIdMap] = useState<Record<string, string>>({});

  const { data: status, isLoading } = useQuery({
    queryKey: ["telegram-status"],
    queryFn: telegramApi.status,
    refetchInterval: linkData ? 3000 : false, // poll every 3s while waiting for link
  });

  // When status becomes connected while we have linkData, clear linkData
  useEffect(() => {
    if (status?.connected && linkData) {
      setLinkData(null);
      setCountdown(0);
      toast({ title: "✅ Telegram conectado!", description: "Sua conta foi vinculada com sucesso." });
    }
  }, [status?.connected, linkData]);

  // Countdown timer for code expiry
  useEffect(() => {
    if (!linkData) return;
    setCountdown(linkData.expiresInMinutes * 60);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); setLinkData(null); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [linkData]);

  const generateMut = useMutation({
    mutationFn: telegramApi.generateCode,
    onSuccess: (data) => setLinkData(data),
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const unlinkMut = useMutation({
    mutationFn: telegramApi.unlink,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["telegram-status"] }); toast({ title: "Telegram desconectado." }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const testMut = useMutation({
    mutationFn: telegramApi.sendTest,
    onSuccess: () => toast({ title: "✅ Mensagem enviada!", description: "Verifique seu Telegram." }),
    onError: () => toast({ title: "Erro ao enviar", description: "Verifique sua conexão.", variant: "destructive" }),
  });

  // ── bots ──────────────────────────────────────────────────────────────────
  const { data: bots = [], isLoading: botsLoading } = useQuery({
    queryKey: ["telegram-bots"],
    queryFn: telegramBotsApi.list,
  });

  const createBotMut = useMutation({
    mutationFn: telegramBotsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["telegram-bots"] });
      setBotDialogOpen(false);
      toast({ title: "✅ Bot adicionado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateBotMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof telegramBotsApi.update>[1]) =>
      telegramBotsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["telegram-bots"] });
      setBotDialogOpen(false);
      setEditingBot(null);
      toast({ title: "✅ Bot atualizado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteBotMut = useMutation({
    mutationFn: telegramBotsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["telegram-bots"] });
      qc.invalidateQueries({ queryKey: ["routine-recipients"] });
      toast({ title: "Bot removido." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const testBotMut = useMutation({
    mutationFn: ({ id, chatId }: { id: string; chatId: string }) => telegramBotsApi.test(id, chatId),
    onSuccess: (data) => {
      if (data.ok) toast({ title: "✅ Mensagem enviada!", description: "Verifique o Telegram." });
      else toast({ title: "❌ Falha no envio", description: "Verifique o token e o Chat ID.", variant: "destructive" });
    },
    onError: () => toast({ title: "Erro", description: "Falha ao testar bot.", variant: "destructive" }),
  });

  const handleSaveBot = (data: CreateBotPayload & { id?: string }) => {
    if (data.id) {
      const { id, ...rest } = data;
      updateBotMut.mutate({ id, ...rest });
    } else {
      createBotMut.mutate(data as CreateBotPayload);
    }
  };

  const copyCode = async () => {
    if (!linkData) return;
    await navigator.clipboard.writeText(linkData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCountdown = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Integração com Telegram</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Receba notificações e relatórios diretamente no seu Telegram.
        </p>
      </div>

      {/* Status card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status?.connected ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                <MessageCircle className={`w-5 h-5 ${status?.connected ? "text-green-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium">@GestorFacilBot</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={status?.connected ? "default" : "secondary"} className="text-xs">
                    {status?.connected ? "✅ Conectado" : "Não conectado"}
                  </Badge>
                  {status?.connected && status.linkedAt && (
                    <span className="text-xs text-muted-foreground">
                      desde {new Date(status.linkedAt).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {status?.connected && (
                <>
                  <Button variant="outline" size="sm" onClick={() => testMut.mutate()} disabled={testMut.isPending}>
                    {testMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="ml-1.5">Testar</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => unlinkMut.mutate()} disabled={unlinkMut.isPending}>
                    <Unlink className="w-4 h-4 mr-1.5" /> Desconectar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connect flow */}
      {!status?.connected && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Vincular conta ao Telegram</h4>
              {linkData && (
                <span className="text-sm font-mono text-muted-foreground">
                  Expira em {formatCountdown(countdown)}
                </span>
              )}
            </div>

            {!linkData ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Clique em "Gerar Código", depois abra o bot no Telegram e envie o código gerado.
                </p>
                <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
                  {generateMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
                  Gerar Código de Vinculação
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span>Abra o Telegram e acesse o bot <strong>@GestorFacilBot</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span>Envie o código abaixo para o bot (ou clique em "Abrir no Telegram")</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <span>Aguarde a confirmação — esta tela atualizará automaticamente ✅</span>
                  </li>
                </ol>

                {/* Code display */}
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <span className="text-2xl font-mono font-bold tracking-[0.3em] text-foreground">
                    {linkData.code}
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyCode}>
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={linkData.deepLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1.5" /> Abrir no Telegram
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aguardando vinculação...
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Novo código
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      <div className="rounded-lg border p-4 bg-muted/40 space-y-2">
        <p className="text-sm font-medium">O que você receberá no Telegram:</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Relatórios semanais e mensais de atendimentos gerados pela IA</li>
          <li>Alertas de inadimplência e pendências críticas</li>
          <li>Notificações de insights da IA</li>
        </ul>
      </div>

      {/* ── Bots da empresa ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Bot className="w-4 h-4" /> Bots cadastrados
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Adicione bots extras para enviar relatórios a diferentes destinatários.
            </p>
          </div>
          <Button size="sm" onClick={() => { setEditingBot(null); setBotDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Adicionar Bot
          </Button>
        </div>

        {botsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : bots.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum bot adicional cadastrado. O bot padrão (<strong>@GestorFacilBot</strong>) continuará sendo usado.
          </div>
        ) : (
          <div className="space-y-3">
            {bots.map(bot => (
              <Card key={bot.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{bot.name}</span>
                        {bot.username && (
                          <span className="text-xs text-muted-foreground">@{bot.username}</span>
                        )}
                        <Badge variant={bot.active ? "default" : "secondary"} className="text-xs">
                          {bot.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{bot.tokenMask}</p>

                      {/* Mini-form de teste */}
                      <div className="flex gap-2 mt-3 items-center">
                        <Input
                          className="h-7 text-xs w-40"
                          placeholder="Chat ID para testar"
                          value={testChatIdMap[bot.id] ?? ""}
                          onChange={(e) => setTestChatIdMap(prev => ({ ...prev, [bot.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={testBotMut.isPending || !testChatIdMap[bot.id]?.trim()}
                          onClick={() => testBotMut.mutate({ id: bot.id, chatId: testChatIdMap[bot.id] })}
                        >
                          {testBotMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
                          <span className="ml-1">Testar</span>
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditingBot(bot); setBotDialogOpen(true); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteBotMut.mutate(bot.id)}
                        disabled={deleteBotMut.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de bot */}
      <BotDialog
        open={botDialogOpen}
        onClose={() => { setBotDialogOpen(false); setEditingBot(null); }}
        onSave={handleSaveBot}
        saving={createBotMut.isPending || updateBotMut.isPending}
        bot={editingBot}
      />
    </div>
  );
}
