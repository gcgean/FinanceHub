import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle } from "lucide-react";
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
import { usersApi } from "@/api/users";
import { type Routine, type CreateRoutinePayload, type RoutineType } from "@/api/routines";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = [
  { label: "Dom", short: "D", value: 0 },
  { label: "Seg", short: "S", value: 1 },
  { label: "Ter", short: "T", value: 2 },
  { label: "Qua", short: "Q", value: 3 },
  { label: "Qui", short: "Q", value: 4 },
  { label: "Sex", short: "S", value: 5 },
  { label: "Sáb", short: "S", value: 6 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateRoutinePayload) => void;
  saving: boolean;
  context: string;
  routine?: Routine | null; // edição
}

export function RoutineDialog({ open, onClose, onSave, saving, context, routine }: Props) {
  const isEdit = !!routine;

  const [name, setName] = useState("");
  const [type, setType] = useState<RoutineType>("DAILY");
  const [userId, setUserId] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [weekDay, setWeekDay] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [hour, setHour] = useState<number>(8);
  const [minute, setMinute] = useState<number>(0);

  // Pré-preenche ao editar
  useEffect(() => {
    if (routine) {
      setName(routine.name);
      setType(routine.type);
      setUserId(routine.userId);
      setHour(routine.hour);
      setMinute(routine.minute);
      if (routine.type === "DAILY") setDaysOfWeek(routine.daysOfWeek);
      if (routine.type === "WEEKLY") setWeekDay(routine.daysOfWeek[0] ?? 1);
      if (routine.type === "MONTHLY") setDayOfMonth(routine.dayOfMonth ?? 1);
    } else {
      setName("");
      setType("DAILY");
      setUserId("");
      setDaysOfWeek([1, 2, 3, 4, 5]);
      setWeekDay(1);
      setDayOfMonth(1);
      setHour(8);
      setMinute(0);
    }
  }, [routine, open]);

  const { data: usersData } = useQuery({
    queryKey: ["users-for-routine"],
    queryFn: () => usersApi.list({ take: 200, skip: 0 }),
    enabled: open,
  });

  const users = usersData?.items ?? [];
  const selectedUser = users.find((u) => u.id === userId);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    if (!name.trim() || !userId) return;

    const payload: CreateRoutinePayload = {
      name: name.trim(),
      type,
      context,
      userId,
      daysOfWeek: type === "DAILY" ? daysOfWeek : type === "WEEKLY" ? [weekDay] : [],
      dayOfMonth: type === "MONTHLY" ? dayOfMonth : null,
      hour,
      minute,
      active: true,
    };
    onSave(payload);
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Rotina" : "Nova Rotina de Notificação"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label>Nome da Rotina</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Relatório diário de atendimentos"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Frequência</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["DAILY", "WEEKLY", "MONTHLY"] as RoutineType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    type === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {t === "DAILY" ? "📅 Diária" : t === "WEEKLY" ? "📆 Semanal" : "🗓️ Mensal"}
                </button>
              ))}
            </div>
          </div>

          {/* Dias da semana — DAILY */}
          {type === "DAILY" && (
            <div className="space-y-1.5">
              <Label>Dias da Semana</Label>
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    title={day.label}
                    className={cn(
                      "w-9 h-9 rounded-lg border text-xs font-medium transition-colors",
                      daysOfWeek.includes(day.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
              {daysOfWeek.length === 0 && (
                <p className="text-xs text-destructive">Selecione ao menos um dia.</p>
              )}
            </div>
          )}

          {/* Dia da semana — WEEKLY */}
          {type === "WEEKLY" && (
            <div className="space-y-1.5">
              <Label>Dia da Semana</Label>
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => setWeekDay(day.value)}
                    title={day.label}
                    className={cn(
                      "w-9 h-9 rounded-lg border text-xs font-medium transition-colors",
                      weekDay === day.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dia do mês — MONTHLY */}
          {type === "MONTHLY" && (
            <div className="space-y-1.5">
              <Label>Dia do Mês</Label>
              <Select
                value={String(dayOfMonth)}
                onValueChange={(v) => setDayOfMonth(Number(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      Dia {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Horário */}
          <div className="space-y-1.5">
            <Label>Horário de Envio</Label>
            <div className="flex items-center gap-2">
              <Select value={String(hour)} onValueChange={(v) => setHour(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hourOptions.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground font-mono">:</span>
              <Select value={String(minute)} onValueChange={(v) => setMinute(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minuteOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {String(m).padStart(2, "0")}min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground ml-1">
                → {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Usuário destinatário */}
          <div className="space-y-1.5">
            <Label>Destinatário</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o usuário..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2">
                      <span>{u.name}</span>
                      {u.telegramChatId ? (
                        <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <span className="text-xs text-muted-foreground">(sem Telegram)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUser && !selectedUser.telegramChatId && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5 mt-1">
                ⚠️ Este usuário não tem o Telegram configurado. A notificação não será entregue.
              </p>
            )}
            {selectedUser?.telegramChatId && (
              <p className="text-xs text-green-600 flex items-center gap-1.5 mt-1">
                ✅ Telegram conectado — notificações serão entregues.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !userId || (type === "DAILY" && daysOfWeek.length === 0)}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Salvar" : "Criar Rotina"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
