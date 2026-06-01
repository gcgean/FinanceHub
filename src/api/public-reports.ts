import { apiFetch } from "@/utils/api";

export type PublicReport = {
  id: string;
  token: string;
  title: string;
  content: string;
  context: string;
  type: string;
  periodFrom: string;
  periodTo: string;
  expiresAt: string;
  createdAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metricas?: Record<string, any> | null;
};

export const publicReportsApi = {
  get: (token: string) =>
    apiFetch<PublicReport>(`/public-reports/${token}`),
};
