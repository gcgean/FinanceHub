import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, Plus, Edit, Trash2, Play, Pause, Loader2,
  MessageCircle, CalendarDays, CalendarRange, Calendar, Clock, SendHorizontal,
  Users, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { routinesApi, type Routine, type CreateRoutinePayload } from "@/api/routines";
import { recipientsApi, type RoutineRecipient, type CreateRecipientPayload } from "@/api/routine-recipients";
import { RoutineDialog } from "./RoutineDialog";
import { RecipientDialog } from "./RecipientDialog";
import { cn } from "@/lib/utils";

const DAYS_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function typeIcon(type: string) {
  if (type === "DAILY") return <CalendarDays className="w-4 h-4" />;
  if (type === "WEEKLY") return <CalendarRange className="w-4 h-4" />;
  return <Calendar className="w-4 h-4" />;
}

function typeLabel(type: string) {
  if (type === "DAILY") return "Diária";
  if (type === "WEEKLY") return "Semanal";
  return "Mensal";
}

function scheduleDescription(routine: Routine): string {
  const time = `${String(routine.hour).padStart(2, "0")}:${String(routine.minute).padStart(2, "0")}`;
  if (routine.type === "DAILY") {
    const days = routine.daysOfWeek.map((d) => DAYS_LABEL[d]).join(", ");
    return `${days} às ${time}`;
  }
  if (routine.type === "WEEKLY") {
    const day = DAYS_LABEL[routine.daysOfWeek[0] ?? 0];
    return `Toda ${day} às ${time}`;
  }
  return `Todo dia ${routine.dayOfMonth} às ${time}`;
}

function periodLabel(routine: Routine): string | null {
  if (routine.previousDay) return "⏮️ Dia anterior";
  return null;
}

function recipientInfo(routine: Routine) {
  if (routine.recipient) {
    return {
      name: routine.recipient.name,
      hasTelegram: !!routine.recipient.telegramChatId,
      role: routine.recipient.role,
    };
  }
  if (routine.user) {
    return {
      name: routine.user.name,
      hasTelegram: !!routine.user.telegramChatId,
      role: null,
    };
  }
  return { name: "—", hasTelegram: false, role: null };
}

interface Props {
  open: boolean;
  onClose: () => void;
  context: string;
  contextLabel: string;
}

type Tab = "routines" | "recipients";

export function RoutinePanel({ open, onClose, context, contextLabel }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("routines");

  // ── Routines state ───────────────────────────────────────────────────────────
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [deletingRoutine, setDeletingRoutine] = useState<Routine | null>(null);

  // ── Recipients state ─────────────────────────────────────────────────────────
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<RoutineRecipient | null>(null);
  const [deletingRecipient, setDeletingRecipient] = useState<RoutineRecipient | null>(null);

  // ── Routines queries ─────────────────────────────────────────────────────────
  const { data: routines = [], isLoading: loadingRoutines } = useQuery({
    queryKey: ["routines", context],
    queryFn: () => routinesApi.list(context),
    enabled: open,
  });

  const createRoutineMut = useMutation({
    mutationFn: (data: CreateRoutinePayload) => routinesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines", context] });
      setRoutineDialogOpen(false);
      toast({ title: "✅ Rotina criada!" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateRoutineMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRoutinePayload> }) =>
      routinesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines", context] });
      setRoutineDialogOpen(false);
      setEditingRoutine(null);
      toast({ title: "✅ Rotina atualizada!" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => routinesApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines", context] }),
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteRoutineMut = useMutation({
    mutationFn: (id: string) => routinesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines", context] });
      setDeletingRoutine(null);
      toast({ title: "Rotina removida." });
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const runMut = useMutation({
    mutationFn: (id: string) => routinesApi.run(id),
    onSuccess: () =>
      toast({ title: "📨 Mensagem de teste enviada!", description: "Verifique o Telegram do destinatário." }),
    onError: (e: Error) => {
      const msg =
        e.message === "USER_NO_TELEGRAM"
          ? "Destinatário não tem Telegram configurado."
          : e.message;
      toast({ title: "Erro ao testar", description: msg, variant: "destructive" });
    },
  });

  // ── Recipients queries ───────────────────────────────────────────────────────
  const { data: recipients = [], isLoading: loadingRecipients } = useQuery({
    queryKey: ["routine-recipients"],
    queryFn: () => recipientsApi.list(),
    enabled: open,
  });

  const createRecipientMut = useMutation({
    mutationFn: (data: CreateRecipientPayload) => recipientsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routine-recipients"] });
      setRecipientDialogOpen(false);
      toast({ title: "✅ Destinatário criado!" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateRecipientMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRecipientPayload> }) =>
      recipientsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routine-recipients"] });
      setRecipientDialogOpen(false);
      setEditingRecipient(null);
      toast({ title: "✅ Destinatário atualizado!" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteRecipientMut = useMutation({
    mutationFn: (id: string) => recipientsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routine-recipients"] });
      setDeletingRecipient(null);
      toast({ title: "Destinatário removido." });
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSaveRoutine = (data: CreateRoutinePayload) => {
    if (editingRoutine) {
      updateRoutineMut.mutate({ id: editingRoutine.id, data });
    } else {
      createRoutineMut.mutate(data);
    }
  };

  const handleSaveRecipient = (data: CreateRecipientPayload) => {
    if (editingRecipient) {
      updateRecipientMut.mutate({ id: editingRecipient.id, data });
    } else {
      createRecipientMut.mutate(data);
    }
  };

  const savingRoutine = createRoutineMut.isPending || updateRoutineMut.isPending;
  const savingRecipient = createRecipientMut.isPending || updateRecipientMut.isPending;

  // Grouped recipients
  const supervisores = recipients.filter((r) => r.role === "SUPERVISOR");
  const atendentes = recipients.filter((r) => r.role === "ATTENDANT");

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-[500px] flex flex-col p-0">
          {/* Header */}
          <SheetHeader className="px-6 py-5 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-base">Rotinas de Notificação</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{contextLabel}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (activeTab === "routines") {
                    setEditingRoutine(null);
                    setRoutineDialogOpen(true);
                  } else {
                    setEditingRecipient(null);
                    setRecipientDialogOpen(true);
                  }
                }}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {activeTab === "routines" ? "Nova Rotina" : "Novo Destinatário"}
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 bg-muted/50 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("routines")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === "routines"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Bell className="w-3.5 h-3.5" />
                Rotinas
                {routines.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                    {routines.length}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("recipients")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === "recipients"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Destinatários
                {recipients.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                    {recipients.length}
                  </Badge>
                )}
              </button>
            </div>
          </SheetHeader>

          {/* ── Tab: Rotinas ───────────────────────────────────────────────── */}
          {activeTab === "routines" && (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingRoutines ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : routines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Bell className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Nenhuma rotina configurada</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                    Crie uma rotina para receber relatórios automáticos no Telegram.
                  </p>
                  <Button className="mt-5 gap-2" onClick={() => { setEditingRoutine(null); setRoutineDialogOpen(true); }}>
                    <Plus className="w-4 h-4" />
                    Criar primeira rotina
                  </Button>
                </div>
              ) : (
                routines.map((routine) => {
                  const info = recipientInfo(routine);
                  return (
                    <div
                      key={routine.id}
                      className={cn(
                        "rounded-xl border p-4 space-y-3 transition-colors",
                        routine.active ? "bg-card" : "bg-muted/30 opacity-70"
                      )}
                    >
                      {/* Cabeçalho do card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              routine.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {typeIcon(routine.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{routine.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                {typeLabel(routine.type)}
                              </Badge>
                              {info.role && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  {info.role === "SUPERVISOR" ? "👔" : "🧑‍💻"}
                                </Badge>
                              )}
                              {routine.previousDay && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 text-violet-600 border-violet-200">
                                  ⏮️ Dia ant.
                                </Badge>
                              )}
                              {routine.departamentos && routine.departamentos.length > 0 && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 text-blue-600 border-blue-200">
                                  🏢 {routine.departamentos.length === 1 ? routine.departamentos[0] : `${routine.departamentos.length} depts`}
                                </Badge>
                              )}
                              {!routine.active && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
                                  Pausada
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                            title="Testar agora"
                            onClick={() => runMut.mutate(routine.id)}
                            disabled={runMut.isPending}
                          >
                            {runMut.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <SendHorizontal className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                            title={routine.active ? "Pausar" : "Ativar"}
                            onClick={() => toggleMut.mutate(routine.id)}
                            disabled={toggleMut.isPending}
                          >
                            {routine.active ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                            title="Editar"
                            onClick={() => { setEditingRoutine(routine); setRoutineDialogOpen(true); }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                            title="Excluir"
                            onClick={() => setDeletingRoutine(routine)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Detalhes */}
                      <div className="space-y-1.5 pl-10">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{scheduleDescription(routine)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {info.name}
                            {info.hasTelegram ? (
                              <span className="ml-1.5 text-green-600">● Telegram ativo</span>
                            ) : (
                              <span className="ml-1.5 text-amber-500">⚠ Sem Telegram</span>
                            )}
                          </span>
                        </div>
                        {routine.lastRunAt && (
                          <div className="text-xs text-muted-foreground">
                            Último envio: {new Date(routine.lastRunAt).toLocaleString("pt-BR")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Tab: Destinatários ─────────────────────────────────────────── */}
          {activeTab === "recipients" && (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {loadingRecipients ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : recipients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Nenhum destinatário cadastrado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                    Cadastre supervisores e atendentes para receber relatórios automáticos.
                  </p>
                  <Button className="mt-5 gap-2" onClick={() => { setEditingRecipient(null); setRecipientDialogOpen(true); }}>
                    <Plus className="w-4 h-4" />
                    Cadastrar destinatário
                  </Button>
                </div>
              ) : (
                <>
                  {supervisores.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <span>👔 Supervisores</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      {supervisores.map((r) => (
                        <RecipientCard
                          key={r.id}
                          recipient={r}
                          onEdit={() => { setEditingRecipient(r); setRecipientDialogOpen(true); }}
                          onDelete={() => setDeletingRecipient(r)}
                        />
                      ))}
                    </div>
                  )}

                  {atendentes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <span>🧑‍💻 Atendentes</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      {atendentes.map((r) => (
                        <RecipientCard
                          key={r.id}
                          recipient={r}
                          onEdit={() => { setEditingRecipient(r); setRecipientDialogOpen(true); }}
                          onDelete={() => setDeletingRecipient(r)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer */}
          {activeTab === "routines" && routines.length > 0 && (
            <div className="px-6 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
              {routines.filter((r) => r.active).length} de {routines.length} rotina(s) ativa(s)
            </div>
          )}
          {activeTab === "recipients" && recipients.length > 0 && (
            <div className="px-6 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
              {supervisores.length} supervisor(es) · {atendentes.length} atendente(s)
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog criar/editar rotina */}
      <RoutineDialog
        open={routineDialogOpen}
        onClose={() => { setRoutineDialogOpen(false); setEditingRoutine(null); }}
        onSave={handleSaveRoutine}
        saving={savingRoutine}
        context={context}
        routine={editingRoutine}
      />

      {/* Dialog criar/editar destinatário */}
      <RecipientDialog
        open={recipientDialogOpen}
        onClose={() => { setRecipientDialogOpen(false); setEditingRecipient(null); }}
        onSave={handleSaveRecipient}
        saving={savingRecipient}
        recipient={editingRecipient}
      />

      {/* Confirmar exclusão de rotina */}
      <AlertDialog
        open={!!deletingRoutine}
        onOpenChange={(o) => { if (!o) setDeletingRoutine(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Rotina</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir a rotina <strong>{deletingRoutine?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingRoutine && deleteRoutineMut.mutate(deletingRoutine.id)}
              disabled={deleteRoutineMut.isPending}
            >
              {deleteRoutineMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar exclusão de destinatário */}
      <AlertDialog
        open={!!deletingRecipient}
        onOpenChange={(o) => { if (!o) setDeletingRecipient(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Destinatário</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir o destinatário <strong>{deletingRecipient?.name}</strong>? As rotinas vinculadas a ele precisarão ser atualizadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingRecipient && deleteRecipientMut.mutate(deletingRecipient.id)}
              disabled={deleteRecipientMut.isPending}
            >
              {deleteRecipientMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── RecipientCard ─────────────────────────────────────────────────────────────

function RecipientCard({
  recipient,
  onEdit,
  onDelete,
}: {
  recipient: RoutineRecipient;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 flex items-start justify-between gap-2 transition-colors",
        recipient.active ? "bg-card" : "bg-muted/30 opacity-60"
      )}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{recipient.name}</span>
          {!recipient.active && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
              Inativo
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {recipient.telegramChatId ? (
            <span className="text-green-600 flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              Telegram ativo
            </span>
          ) : (
            <span className="text-amber-500">⚠ Sem Telegram</span>
          )}
          {recipient.role === "ATTENDANT" && recipient.usuAtend && (
            <span>Filtra: <strong>{recipient.usuAtend}</strong></span>
          )}
          {recipient.role === "SUPERVISOR" && recipient.departamentos.length > 0 && (
            <span>Depts: <strong>{recipient.departamentos.join(", ")}</strong></span>
          )}
          {recipient.role === "SUPERVISOR" && recipient.departamentos.length === 0 && (
            <span className="text-muted-foreground/70">Todos os departamentos</span>
          )}
          {recipient.aiInstructions && (
            <span className="text-amber-600">🤖 Instruções IA configuradas</span>
          )}
        </div>
      </div>

      <div className="flex gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="w-7 h-7 p-0"
          onClick={onEdit}
          title="Editar"
        >
          <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-7 h-7 p-0 text-destructive hover:text-destructive"
          onClick={onDelete}
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
