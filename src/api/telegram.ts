import { apiFetch } from "@/utils/api";

export type TelegramStatus = {
  connected: boolean;
  chatId: string | null;
  linkedAt: string | null;
};

export type LinkCodeResponse = {
  code: string;
  botUsername: string;
  expiresInMinutes: number;
  deepLink: string;
};

export const telegramApi = {
  status: () => apiFetch<TelegramStatus>("/telegram/status"),
  generateCode: () => apiFetch<LinkCodeResponse>("/telegram/link-code", { method: "POST" }),
  unlink: () => apiFetch<{ ok: true }>("/telegram/unlink", { method: "DELETE" }),
  sendTest: () => apiFetch<{ ok: true }>("/telegram/test", { method: "POST" }),
  sendTestToUser: (userId: string) => apiFetch<{ ok: true }>(`/telegram/test/${userId}`, { method: "POST" }),
};
