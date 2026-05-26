import { apiFetch } from "@/utils/api";

export type RecipientRole = "SUPERVISOR" | "ATTENDANT";

export type RoutineRecipient = {
  id: string;
  companyId: string;
  name: string;
  role: RecipientRole;
  telegramChatId: string | null;
  email: string | null;
  whatsapp: string | null;
  usuAtend: string | null;
  departamentos: string[];
  notes: string | null;
  aiInstructions: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecipientPayload = {
  name: string;
  role: RecipientRole;
  telegramChatId?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  usuAtend?: string | null;
  departamentos?: string[];
  notes?: string | null;
  aiInstructions?: string | null;
  active?: boolean;
};

export const recipientsApi = {
  list: () => apiFetch<RoutineRecipient[]>("/routine-recipients"),

  create: (data: CreateRecipientPayload) =>
    apiFetch<RoutineRecipient>("/routine-recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateRecipientPayload>) =>
    apiFetch<RoutineRecipient>(`/routine-recipients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ ok: true }>(`/routine-recipients/${id}`, { method: "DELETE" }),
};
