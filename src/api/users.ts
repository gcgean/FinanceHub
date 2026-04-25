import { apiFetch } from "@/utils/api";

export type UserCompanyRef = {
  id: string;
  companyId: string;
  company: { id: string; name: string; cnpj: string | null };
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "OPERATOR" | "CLIENT";
  active: boolean;
  companyId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  telegramChatId: string | null;
  userCompanies: UserCompanyRef[];
  accessGroupId: string | null;
  accessGroup: { id: string; name: string; permissions: string[] } | null;
};

export type UsersResponse = {
  items: User[];
  total: number;
  take: number;
  skip: number;
};

export type CreateUserPayload = {
  email: string;
  name: string;
  password: string;
  role: User["role"];
  companyId?: string | null;
  companyIds?: string[];
};

export type UpdateUserPayload = {
  name?: string;
  password?: string;
  role?: User["role"];
  active?: boolean;
  companyId?: string | null;
  companyIds?: string[];
  accessGroupId?: string | null;
};

export const usersApi = {
  list: (params?: { q?: string; role?: string; companyId?: string; take?: number; skip?: number }) => {
    const p = new URLSearchParams();
    if (params?.q) p.set("q", params.q);
    if (params?.role) p.set("role", params.role);
    if (params?.companyId) p.set("companyId", params.companyId);
    if (params?.take) p.set("take", String(params.take));
    if (params?.skip) p.set("skip", String(params.skip));
    return apiFetch<UsersResponse>(`/users?${p.toString()}`);
  },

  get: (id: string) => apiFetch<User>(`/users/${id}`),

  create: (data: CreateUserPayload) =>
    apiFetch<User>("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateUserPayload) =>
    apiFetch<User>(`/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ ok: true }>(`/users/${id}`, { method: "DELETE" }),
};
