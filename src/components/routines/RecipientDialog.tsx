import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RoutineRecipient, CreateRecipientPayload, RecipientRole } from "@/api/routine-recipients";
import { telegramBotsApi } from "@/api/telegram-bots";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateRecipientPayload) => void;
  saving: boolean;
  recipient?: RoutineRecipient | null;
}

export function RecipientDialog({ open, onClose, onSave, saving, recipient }: Props) {
  const isEdit = !!recipient;

  const [name, setName] = useState("");
  const [role, setRole] = useState<RecipientRole>("SUPERVISOR");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [usuAtend, setUsuAtend] = useState("");
  const [departamentos, setDepartamentos] = useState("");
  const [notes, setNotes] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [telegramBotId, setTelegramBotId] = useState<string | null>(null);
  const [active, setActive] = useState(true);

  const { data: bots = [] } = useQuery({
    queryKey: ["telegram-bots"],
    queryFn: telegramBotsApi.list,
  });

  useEffect(() => {
    if (recipient) {
      setName(recipient.name);
      setRole(recipient.role);
      setTelegramChatId(recipient.telegramChatId ?? "");
      setEmail(recipient.email ?? "");
      setWhatsapp(recipient.whatsapp ?? "");
      setUsuAtend(recipient.usuAtend ?? "");
      setDepartamentos(recipient.departamentos.join(", "));
      setNotes(recipient.notes ?? "");
      setAiInstructions(recipient.aiInstructions ?? "");
      setTelegramBotId(recipient.telegramBotId ?? null);
      setActive(recipient.active);
    } else {
      setName("");
      setRole("SUPERVISOR");
      setTelegramChatId("");
      setEmail("");
      setWhatsapp("");
      setUsuAtend("");
      setDepartamentos("");
      setNotes("");
      setAiInstructions("");
      setTelegramBotId(null);
      setActive(true);
    }
  }, [recipient, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    // Atendente sem usuAtend faria o relatório cobrir a equipe inteira (ver routine-scheduler).
    if (role === "ATTENDANT" && !usuAtend.trim()) {
      alert('Para um Atendente é obrigatório preencher "Nome no Sistema de Atendimento" — sem ele o relatório cobriria a equipe inteira.');
      return;
    }

    const deptArray = departamentos
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    onSave({
      name: name.trim(),
      role,
      telegramChatId: telegramChatId.trim() || null,
      email: email.trim() || null,
      whatsapp: whatsapp.trim() || null,
      usuAtend: role === "ATTENDANT" ? (usuAtend.trim() || null) : null,
      departamentos: role === "SUPERVISOR" ? deptArray : [],
      notes: notes.trim() || null,
      aiInstructions: aiInstructions.trim() || null,
      telegramBotId: telegramBotId || null,
      active,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Destinatário" : "Novo Destinatário"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Papel */}
          <div className="space-y-1.5">
            <Label>Tipo de Destinatário</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("SUPERVISOR")}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left",
                  role === "SUPERVISOR"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                )}
              >
                <div className="font-semibold">👔 Supervisor</div>
                <div className={cn("text-xs mt-0.5", role === "SUPERVISOR" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  Recebe relatório geral da equipe
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole("ATTENDANT")}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left",
                  role === "ATTENDANT"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                )}
              >
                <div className="font-semibold">🧑‍💻 Atendente</div>
                <div className={cn("text-xs mt-0.5", role === "ATTENDANT" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  Recebe seu desempenho individual
                </div>
              </button>
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João Silva"
            />
          </div>

          {/* Telegram */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Telegram Chat ID
                <span className="text-muted-foreground text-xs ml-2">(obrigatório)</span>
              </Label>
              <Input
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Ex: 123456789"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Bot do Telegram
                <span className="text-muted-foreground text-xs ml-2">(padrão se vazio)</span>
              </Label>
              <Select
                value={telegramBotId ?? "__default__"}
                onValueChange={(v) => setTelegramBotId(v === "__default__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bot padrão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">🤖 Bot padrão</SelectItem>
                  {bots.filter(b => b.active).map(bot => (
                    <SelectItem key={bot.id} value={bot.id}>
                      {bot.name}
                      {bot.username && <span className="text-muted-foreground ml-1">@{bot.username}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Email */}
            <div className="space-y-1.5">
              <Label>E-mail <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
                type="email"
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <Label>WhatsApp <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Campo específico por papel */}
          {role === "ATTENDANT" && (
            <div className="space-y-1.5">
              <Label>
                Nome no Sistema de Atendimento
                <span className="text-muted-foreground text-xs ml-2">(campo usuAtend)</span>
              </Label>
              <Input
                value={usuAtend}
                onChange={(e) => setUsuAtend(e.target.value)}
                placeholder="Ex: DIEGO (como aparece nos tickets)"
              />
              <p className="text-xs text-muted-foreground">
                Relatórios filtrarão automaticamente apenas os atendimentos deste técnico.
              </p>
            </div>
          )}

          {role === "SUPERVISOR" && (
            <div className="space-y-1.5">
              <Label>
                Departamentos <span className="text-muted-foreground text-xs">(separados por vírgula — vazio = todos)</span>
              </Label>
              <Input
                value={departamentos}
                onChange={(e) => setDepartamentos(e.target.value)}
                placeholder="Ex: Suporte, Comercial"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para receber o relatório geral de todos os setores.
              </p>
            </div>
          )}

          {/* Instruções para a IA */}
          <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3">
            <Label className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400">
              🤖 Instruções para a IA
              <span className="text-xs font-normal text-amber-600 dark:text-amber-500">(personaliza a análise deste destinatário)</span>
            </Label>
            <textarea
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={
                role === "ATTENDANT"
                  ? "Ex: João é técnico sênior com foco em instalações complexas. Ele gerencia os maiores clientes da carteira e costuma ter TMA maior por conta da complexidade dos atendimentos. A meta dele é 12 atendimentos/dia com nota mínima de 4,5."
                  : "Ex: Supervisor do setor de Suporte N2. Responsável por 5 atendentes. Meta da equipe: 80 atendimentos/dia, TMA máximo de 25 minutos e nota média acima de 4,0."
              }
              rows={6}
              style={{ resize: "vertical" }}
              className="w-full rounded-md border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            />
            <p className="text-xs text-amber-700 dark:text-amber-500">
              Quando esta rotina disparar, a IA usará essas instruções <strong>em vez</strong> do contexto global da equipe. Descreva o perfil, metas e expectativas para que a análise seja personalizada.
            </p>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label>Observações internas <span className="text-muted-foreground text-xs">(não enviado à IA)</span></Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Informações adicionais sobre este destinatário..."
              rows={2}
              style={{ resize: "vertical" }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Salvar" : "Criar Destinatário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
