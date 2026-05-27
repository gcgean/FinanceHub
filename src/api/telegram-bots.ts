import { apiFetch } from "@/utils/api";

export type TelegramBot = {
  id: string;
  companyId: string;
  name: string;
  username: string | null;
  tokenMask: string;   // token mascarado — ex: "•••••••••abc123"
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateBotPayload = {
  name: string;
  username?: string | null;
  token: string;
  active?: boolean;
};

export type UpdateBotPayload = {
  name?: string;
  username?: string | null;
  token?: string;
  active?: boolean;
};

export const telegramBotsApi = {
  list: () =>
    apiFetch<TelegramBot[]>("/telegram-bots"),

  create: (data: CreateBotPayload) =>
    apiFetch<TelegramBot>("/telegram-bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateBotPayload) =>
    apiFetch<TelegramBot>(`/telegram-bots/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ ok: true }>(`/telegram-bots/${id}`, { method: "DELETE" }),

  test: (id: string, chatId: string) =>
    apiFetch<{ ok: boolean }>(`/telegram-bots/${id}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId }),
    }),
};
