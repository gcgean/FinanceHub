// Mock data for admin pages

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  plan: 'basic' | 'professional' | 'enterprise';
  createdAt: string;
  transactionsCount: number;
  pendingCount: number;
  lastActivity: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'client';
  companyId?: string;
  companyName?: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
}

export const mockCompanies: Company[] = [
  {
    id: '1',
    name: 'Tech Solutions Ltda',
    cnpj: '12.345.678/0001-90',
    email: 'financeiro@techsolutions.com.br',
    phone: '(11) 99999-9999',
    status: 'active',
    plan: 'professional',
    createdAt: '2024-06-15',
    transactionsCount: 1250,
    pendingCount: 3,
    lastActivity: '2026-01-31T10:30:00',
  },
  {
    id: '2',
    name: 'Comercial ABC',
    cnpj: '23.456.789/0001-01',
    email: 'contato@comercialabc.com.br',
    phone: '(11) 98888-8888',
    status: 'active',
    plan: 'enterprise',
    createdAt: '2024-03-20',
    transactionsCount: 3450,
    pendingCount: 8,
    lastActivity: '2026-01-31T09:15:00',
  },
  {
    id: '3',
    name: 'Indústria Norte',
    cnpj: '34.567.890/0001-12',
    email: 'financeiro@industrianorte.com.br',
    phone: '(85) 97777-7777',
    status: 'active',
    plan: 'enterprise',
    createdAt: '2024-01-10',
    transactionsCount: 5200,
    pendingCount: 2,
    lastActivity: '2026-01-30T16:45:00',
  },
  {
    id: '4',
    name: 'Varejo Express',
    cnpj: '45.678.901/0001-23',
    email: 'adm@varejoexpress.com.br',
    phone: '(21) 96666-6666',
    status: 'pending',
    plan: 'basic',
    createdAt: '2026-01-28',
    transactionsCount: 0,
    pendingCount: 0,
    lastActivity: '2026-01-28T11:00:00',
  },
  {
    id: '5',
    name: 'Serviços Integrados',
    cnpj: '56.789.012/0001-34',
    email: 'contato@servicosintegrados.com.br',
    phone: '(31) 95555-5555',
    status: 'inactive',
    plan: 'professional',
    createdAt: '2023-11-05',
    transactionsCount: 890,
    pendingCount: 0,
    lastActivity: '2025-12-15T14:20:00',
  },
];

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'João da Silva',
    email: 'joao.silva@financehub.com.br',
    role: 'operator',
    status: 'active',
    lastLogin: '2026-01-31T08:00:00',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria.santos@financehub.com.br',
    role: 'admin',
    status: 'active',
    lastLogin: '2026-01-31T09:30:00',
    createdAt: '2023-06-01',
  },
  {
    id: '3',
    name: 'Carlos Oliveira',
    email: 'carlos@techsolutions.com.br',
    role: 'client',
    companyId: '1',
    companyName: 'Tech Solutions Ltda',
    status: 'active',
    lastLogin: '2026-01-30T16:00:00',
    createdAt: '2024-06-15',
  },
  {
    id: '4',
    name: 'Ana Ferreira',
    email: 'ana@comercialabc.com.br',
    role: 'client',
    companyId: '2',
    companyName: 'Comercial ABC',
    status: 'active',
    lastLogin: '2026-01-31T07:45:00',
    createdAt: '2024-03-20',
  },
  {
    id: '5',
    name: 'Pedro Costa',
    email: 'pedro.costa@financehub.com.br',
    role: 'operator',
    status: 'inactive',
    lastLogin: '2025-12-20T10:00:00',
    createdAt: '2024-08-10',
  },
];

export const planLabels = {
  basic: 'Básico',
  professional: 'Profissional',
  enterprise: 'Enterprise',
};

export const roleLabels = {
  admin: 'Administrador',
  operator: 'Operador BPO',
  client: 'Cliente',
};
