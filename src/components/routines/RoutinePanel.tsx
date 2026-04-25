import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, Plus, Edit, Trash2, Play, Pause, X, Loader2,
  MessageCircle, CalendarDays, CalendarRange, Calendar, Clock, SendHorizontal,
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
import { RoutineDialog } from "./RoutineDialog";
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

interface Props {
  open: boolean;
  onClose: () => void;
  context: string;
  contextLabel: string;
}

export function RoutinePanel({ open, onClose, context, contextLabel }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [deletingRoutine, setDeletingRoutine] = useState<Routine | null>(null);

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ["routines", context],
    queryFn: () => routinesApi.list(context),
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateRoutinePayload) => routinesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines", context] });
      setDialogOpen(false);
      toast({ title: "✅ Rotina criada!" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRoutinePayload> }) =>
      routinesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines", context] });
      setDialogOpen(false);
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

  const deleteMut = useMutation({
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
      toast({ title: "📨 Mensagem de teste enviada!", description: "Verifique seu Telegram." }),
    onError: (e: Error) => {
      const msg =
        e.message === "USER_NO_TELEGRAM"
          ? "Usuário não tem Telegram configurado."
          : e.message;
      toast({ title: "Erro ao testar", description: msg, variant: "destructive" });
    },
  });

  const handleSave = (data: CreateRoutinePayload) => {
    if (editingRoutine) {
      updateMut.mutate({ id: editingRoutine.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const openCreate = () => {
    setEditingRoutine(null);
    setDialogOpen(true);
  };

  const openEdit = (routine: Routine) => {
    setEditingRoutine(routine);
    setDialogOpen(true);
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0">
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
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Nova Rotina
              </Button>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {isLoading ? (
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
                <Button className="mt-5 gap-2" onClick={openCreate}>
                  <Plus className="w-4 h-4" />
                  Criar primeira rotina
                </Button>
              </div>
            ) : (
              routines.map((routine) => (
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
                        onClick={() => openEdit(routine)}
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
                        {routine.user.name}
                        {routine.user.telegramChatId ? (
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
              ))
            )}
          </div>

          {/* Footer info */}
          {routines.length > 0 && (
            <div className="px-6 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
              {routines.filter((r) => r.active).length} de {routines.length} rotina(s) ativa(s)
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog criar/editar */}
      <RoutineDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingRoutine(null); }}
        onSave={handleSave}
        saving={saving}
        context={context}
        routine={editingRoutine}
      />

      {/* Confirmar exclusão */}
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
              onClick={() => deletingRoutine && deleteMut.mutate(deletingRoutine.id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
