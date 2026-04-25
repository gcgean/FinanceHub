// Lista completa de páginas/módulos do sistema.
// Cada entrada tem um id (usado no AccessGroup.permissions[]) e um label.

export type PermissionItem = {
  id: string;
  label: string;
  group: string;
};

export const ALL_PERMISSIONS: PermissionItem[] = [
  // Principal
  { id: "dashboard",               label: "Dashboard",               group: "Principal" },
  { id: "executiveDashboard",      label: "Painel Executivo",         group: "Principal" },
  { id: "aiInsights",              label: "Inteligência IA",          group: "Principal" },

  // Financeiro
  { id: "financialRegistrations",  label: "Cadastros Financeiros",    group: "Financeiro" },
  { id: "ledger",                  label: "Livro-caixa",              group: "Financeiro" },
  { id: "transactions",            label: "Transações",               group: "Financeiro" },
  { id: "pendencies",              label: "Pendências",               group: "Financeiro" },

  // Relatórios
  { id: "reports",                 label: "Relatórios (Geral)",       group: "Relatórios" },
  { id: "salesReports",            label: "Relatório de Vendas",      group: "Relatórios" },
  { id: "accountsReceivableReports", label: "Contas a Receber",       group: "Relatórios" },
  { id: "financialReports",        label: "Relatório Financeiro",     group: "Relatórios" },
  { id: "inventoryReports",        label: "Relatório de Estoque",     group: "Relatórios" },
  { id: "accountsPayableReports",  label: "Contas a Pagar",          group: "Relatórios" },
  { id: "supportTicketsReports",   label: "Relatório de Atendimentos", group: "Relatórios" },

  // Operacional
  { id: "imports",                 label: "Importações",              group: "Operacional" },
  { id: "mapping",                 label: "Mapeamento",               group: "Operacional" },
  { id: "integrations",            label: "Integrações",              group: "Operacional" },

  // Administração
  { id: "departments",             label: "Departamentos",            group: "Administração" },
  { id: "companies",               label: "Empresas",                 group: "Administração" },
  { id: "users",                   label: "Usuários",                 group: "Administração" },
  { id: "accessGroups",            label: "Grupos de Acesso",         group: "Administração" },
  { id: "settings",                label: "Configurações",            group: "Administração" },
  { id: "aiAdmin",                 label: "Admin IA",                 group: "Administração" },
];

export const PERMISSION_GROUPS = [...new Set(ALL_PERMISSIONS.map(p => p.group))];

// Verifica se um usuário tem acesso a uma página.
// Admins sempre têm acesso total.
// Se o usuário não tem grupo, tem acesso total (comportamento legado).
// Se tem grupo, verifica se a permissão está no grupo.
export function hasPermission(
  userRole: string,
  permissions: string[] | undefined | null,
  pageId: string
): boolean {
  if (userRole === "ADMIN") return true;
  if (!permissions || permissions.length === 0) return true; // sem restrições definidas
  return permissions.includes(pageId);
}
