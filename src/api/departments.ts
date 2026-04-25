import { apiFetch } from "@/utils/api";

export type Department = {
  id: string;
  name: string;
  erpCode: string;
  createdAt: string;
};

export function listDepartments(): Promise<Department[]> {
  return apiFetch<Department[]>("/departments");
}

export function createDepartment(data: { name: string; erpCode: string }): Promise<Department> {
  return apiFetch<Department>("/departments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateDepartment(id: string, data: { name: string; erpCode: string }): Promise<Department> {
  return apiFetch<Department>(`/departments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteDepartment(id: string): Promise<void> {
  return apiFetch<void>(`/departments/${id}`, { method: "DELETE" });
}
