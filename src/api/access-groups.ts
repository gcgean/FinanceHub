import { apiFetch } from "@/utils/api";

export type AccessGroup = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
};

export type CreateGroupPayload = {
  name: string;
  description?: string | null;
  permissions: string[];
};

export const accessGroupsApi = {
  list: () => apiFetch<AccessGroup[]>("/access-groups"),

  create: (data: CreateGroupPayload) =>
    apiFetch<AccessGroup>("/access-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  update: (id: string, data: CreateGroupPayload) =>
    apiFetch<AccessGroup>(`/access-groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ ok: true }>(`/access-groups/${id}`, { method: "DELETE" }),
};
