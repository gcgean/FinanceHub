import { apiFetch } from "@/utils/api";
import type { RoutineRecipient } from "./routine-recipients";

export type RoutineType = "DAILY" | "WEEKLY" | "MONTHLY";

export type RoutineUser = {
  id: string;
  name: string;
  email: string;
  telegramChatId: string | null;
};

export type Routine = {
  id: string;
  companyId: string;
  name: string;
  type: RoutineType;
  context: string;
  userId: string | null;
  user: RoutineUser | null;
  recipientId: string | null;
  recipient: Pick<RoutineRecipient, "id" | "name" | "role" | "telegramChatId" | "email" | "whatsapp" | "usuAtend" | "departamentos"> | null;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  hour: number;
  minute: number;
  active: boolean;
  previousDay: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRoutinePayload = {
  name: string;
  type: RoutineType;
  context: string;
  userId?: string | null;
  recipientId?: string | null;
  daysOfWeek: number[];
  dayOfMonth?: number | null;
  hour: number;
  minute: number;
  active?: boolean;
  previousDay?: boolean;
};

export const routinesApi = {
  list: (context?: string) =>
    apiFetch<Routine[]>(`/routines${context ? `?context=${context}` : ""}`),

  create: (data: CreateRoutinePayload) =>
    apiFetch<Routine>("/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateRoutinePayload>) =>
    apiFetch<Routine>(`/routines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ ok: true }>(`/routines/${id}`, { method: "DELETE" }),

  toggle: (id: string) =>
    apiFetch<Routine>(`/routines/${id}/toggle`, { method: "POST" }),

  run: (id: string) =>
    apiFetch<{ ok: true }>(`/routines/${id}/run`, { method: "POST" }),
};
