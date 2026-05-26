import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import type { RoutineRecipient, CreateRecipientPayload, RecipientRole } from "@/api/routine-recipients";

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
  const [active, setActive] = useState(true);

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
      setActive(true);
    }
  }, [recipient, open]);

  const handleSave = () => {
    if (!name.trim()) return;

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
          <div className="space-y-1.5">
            <Label>
              Telegram Chat ID
              <span className="text-muted-foreground text-xs ml-2">(obrigatório para envio)</span>
            </Label>
            <Input
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Ex: 123456789"
            />
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

          {/* Observações */}
          <div className="space-y-1.5">
            <Label>Observações <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Informações adicionais sobre este destinatário..."
              rows={3}
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
