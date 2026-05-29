import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { recipientsApi } from "@/api/routine-recipients";
import { type Routine, type CreateRoutinePayload, type RoutineType } from "@/api/routines";
import { listDepartments } from "@/api/departments";
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
  routine?: Routine | null;
}

export function RoutineDialog({ open, onClose, onSave, saving, context, routine }: Props) {
  const isEdit = !!routine?.id;

  const [name, setName] = useState("");
  const [type, setType] = useState<RoutineType>("DAILY");
  const [recipientId, setRecipientId] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [weekDay, setWeekDay] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [hour, setHour] = useState<number>(8);
  const [minute, setMinute] = useState<number>(0);
  const [previousDay, setPreviousDay] = useState(false);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [deptDropOpen, setDeptDropOpen] = useState(false);

  useEffect(() => {
    if (routine) {
      setName(routine.name);
      setType(routine.type);
      setRecipientId(routine.recipientId ?? "");
      setHour(routine.hour);
      setMinute(routine.minute);
      if (routine.type === "DAILY") setDaysOfWeek(routine.daysOfWeek);
      if (routine.type === "WEEKLY") setWeekDay(routine.daysOfWeek[0] ?? 1);
      if (routine.type === "MONTHLY") setDayOfMonth(routine.dayOfMonth ?? 1);
      setPreviousDay(routine.previousDay ?? false);
      setSelectedDepts(routine.departamentos ?? []);
    } else {
      setName("");
      setType("DAILY");
      setRecipientId("");
      setDaysOfWeek([1, 2, 3, 4, 5]);
      setWeekDay(1);
      setDayOfMonth(1);
      setHour(8);
      setMinute(0);
      setPreviousDay(false);
      setSelectedDepts([]);
    }
  }, [routine, open]);

  const { data: recipients = [] } = useQuery({
    queryKey: ["routine-recipients"],
    queryFn: () => recipientsApi.list(),
    enabled: open,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: listDepartments,
    enabled: open,
  });

  const activeRecipients = recipients.filter((r) => r.active);
  const selectedRecipient = activeRecipients.find((r) => r.id === recipientId);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    if (!name.trim() || !recipientId) return;

    const payload: CreateRoutinePayload = {
      name: name.trim(),
      type,
      context,
      recipientId,
      daysOfWeek: type === "DAILY" ? daysOfWeek : type === "WEEKLY" ? [weekDay] : [],
      dayOfMonth: type === "MONTHLY" ? dayOfMonth : null,
      hour,
      minute,
      active: true,
      previousDay,
      departamentos: selectedDepts,
    };
    onSave(payload);
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  // Group recipients by role
  const supervisores = activeRecipients.filter((r) => r.role === "SUPERVISOR");
  const atendentes = activeRecipients.filter((r) => r.role === "ATTENDANT");

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
                  type="button"
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
                    type="button"
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
                    type="button"
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

          {/* Período do relatório */}
          <div className="space-y-1.5">
            <Label>Período do Relatório</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreviousDay(false)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left",
                  !previousDay
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                )}
              >
                <div className="font-semibold">📅 Dia atual</div>
                <div className={cn("text-xs mt-0.5", !previousDay ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  Movimentação do próprio dia
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPreviousDay(true)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left",
                  previousDay
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                )}
              >
                <div className="font-semibold">⏮️ Dia anterior</div>
                <div className={cn("text-xs mt-0.5", previousDay ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  Relatório de ontem ao acordar
                </div>
              </button>
            </div>
            {previousDay && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                💡 A rotina disparará no horário configurado e enviará a movimentação completa do <strong>dia anterior</strong>. Ideal para relatórios matinais.
              </p>
            )}
          </div>

          {/* Departamentos */}
          <div className="space-y-1.5">
            <Label>
              Departamentos{" "}
              <span className="text-muted-foreground font-normal text-xs">(opcional — deixe vazio para todos)</span>
            </Label>
            {departments.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum departamento cadastrado.</div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDeptDropOpen((v) => !v)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                    deptDropOpen ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted"
                  )}
                >
                  <span className={selectedDepts.length === 0 ? "text-muted-foreground" : ""}>
                    {selectedDepts.length === 0
                      ? "Todos os departamentos"
                      : selectedDepts.length === 1
                        ? departments.find((d) => d.erpCode === selectedDepts[0])?.name ?? selectedDepts[0]
                        : `${selectedDepts.length} departamentos selecionados`}
                  </span>
                  <svg
                    className={cn("w-4 h-4 text-muted-foreground transition-transform", deptDropOpen && "rotate-180")}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {deptDropOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto">
                    {departments.map((dept) => {
                      const checked = selectedDepts.includes(dept.erpCode);
                      return (
                        <label
                          key={dept.erpCode}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedDepts((prev) =>
                                checked ? prev.filter((c) => c !== dept.erpCode) : [...prev, dept.erpCode]
                              )
                            }
                            className="accent-primary"
                          />
                          <span>{dept.name}</span>
                          {dept.erpCode && (
                            <span className="ml-auto text-xs text-muted-foreground">{dept.erpCode}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {selectedDepts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedDepts.map((code) => {
                  const dept = departments.find((d) => d.erpCode === code);
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5"
                    >
                      {dept?.name ?? code}
                      <button
                        type="button"
                        onClick={() => setSelectedDepts((prev) => prev.filter((c) => c !== code))}
                        className="hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedDepts([])}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          {/* Destinatário */}
          <div className="space-y-1.5">
            <Label>Destinatário</Label>
            {activeRecipients.length === 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                <User className="w-4 h-4 mx-auto mb-1" />
                Nenhum destinatário cadastrado.<br />
                Cadastre na aba <strong>Destinatários</strong> do painel de rotinas.
              </div>
            ) : (
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destinatário..." />
                </SelectTrigger>
                <SelectContent>
                  {supervisores.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        👔 Supervisores
                      </div>
                      {supervisores.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          <div className="flex items-center gap-2">
                            <span>{r.name}</span>
                            {r.telegramChatId ? (
                              <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <span className="text-xs text-muted-foreground">(sem Telegram)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {atendentes.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                        🧑‍💻 Atendentes
                      </div>
                      {atendentes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          <div className="flex items-center gap-2">
                            <span>{r.name}</span>
                            {r.telegramChatId ? (
                              <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <span className="text-xs text-muted-foreground">(sem Telegram)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            )}

            {/* Status do selecionado */}
            {selectedRecipient && (
              <div className="rounded-lg bg-muted/50 p-2.5 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {selectedRecipient.role === "SUPERVISOR" ? "👔 Supervisor" : "🧑‍💻 Atendente"}
                  </Badge>
                  {selectedRecipient.telegramChatId ? (
                    <span className="text-green-600">✅ Telegram configurado</span>
                  ) : (
                    <span className="text-amber-600">⚠️ Sem Telegram — notificação não será entregue</span>
                  )}
                </div>
                {selectedRecipient.role === "ATTENDANT" && selectedRecipient.usuAtend && (
                  <div className="text-muted-foreground">
                    Filtra por: <strong>{selectedRecipient.usuAtend}</strong>
                  </div>
                )}
                {selectedRecipient.role === "SUPERVISOR" && selectedRecipient.departamentos.length > 0 && (
                  <div className="text-muted-foreground">
                    Departamentos: <strong>{selectedRecipient.departamentos.join(", ")}</strong>
                  </div>
                )}
                {selectedRecipient.role === "SUPERVISOR" && selectedRecipient.departamentos.length === 0 && (
                  <div className="text-muted-foreground">Relatório geral de toda a equipe</div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              !name.trim() ||
              !recipientId ||
              (type === "DAILY" && daysOfWeek.length === 0)
            }
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Salvar" : "Criar Rotina"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
