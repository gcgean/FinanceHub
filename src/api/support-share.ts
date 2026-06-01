import { apiFetch } from "@/utils/api";

export type SupportShareLink = {
  id: string;
  token: string;
  companyId: string;
  name: string;
  active: boolean;
  createdAt: string;
};

export const supportShareApi = {
  list: () => apiFetch<SupportShareLink[]>("/support-share"),

  create: (name?: string) =>
    apiFetch<SupportShareLink>("/support-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),

  delete: (id: string) =>
    apiFetch<{ ok: true }>(`/support-share/${id}`, { method: "DELETE" }),

  toggle: (id: string) =>
    apiFetch<SupportShareLink>(`/support-share/${id}/toggle`, { method: "PATCH" }),
};
