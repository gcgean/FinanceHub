// Mock data for pendencies

export type PendencyType = 'categorization' | 'attachment' | 'cost_center' | 'approval' | 'review';
export type PendencyPriority = 'high' | 'medium' | 'low';
export type PendencyStatus = 'pending' | 'in_progress' | 'resolved' | 'overdue';

export interface Pendency {
  id: string;
  transactionId: string;
  transactionDescription: string;
  transactionValue: number;
  type: PendencyType;
  question: string;
  priority: PendencyPriority;
  status: PendencyStatus;
  createdAt: string;
  dueAt: string;
  assignedTo: string;
  resolvedAt?: string;
  resolvedBy?: string;
  response?: string;
}

export const mockPendencies: Pendency[] = [
  {
    id: '1',
    transactionId: '3',
    transactionDescription: 'TRANSF PIX JOSE MARIA',
    transactionValue: -1200,
    type: 'categorization',
    question: 'Qual a categoria desta transação?',
    priority: 'high',
    status: 'overdue',
    createdAt: '2026-01-27T10:00:00',
    dueAt: '2026-01-29T18:00:00',
    assignedTo: 'Cliente',
  },
  {
    id: '2',
    transactionId: '5',
    transactionDescription: 'DEB AUTOMATICO - CEMIG ENERGIA',
    transactionValue: -1850.45,
    type: 'attachment',
    question: 'Anexe o comprovante ou nota fiscal',
    priority: 'medium',
    status: 'pending',
    createdAt: '2026-01-28T14:00:00',
    dueAt: '2026-01-31T18:00:00',
    assignedTo: 'Cliente',
  },
  {
    id: '3',
    transactionId: '6',
    transactionDescription: 'COMPRA CARTAO - MATERIAL ESCRITORIO',
    transactionValue: -350,
    type: 'cost_center',
    question: 'Qual o centro de custo desta despesa?',
    priority: 'low',
    status: 'pending',
    createdAt: '2026-01-28T16:00:00',
    dueAt: '2026-02-03T18:00:00',
    assignedTo: 'Cliente',
  },
  {
    id: '4',
    transactionId: '4',
    transactionDescription: 'TED RECEBIDA - CONTRATO 2024/001',
    transactionValue: 45000,
    type: 'approval',
    question: 'Confirma a categoria sugerida pela IA?',
    priority: 'high',
    status: 'pending',
    createdAt: '2026-01-29T09:00:00',
    dueAt: '2026-01-31T12:00:00',
    assignedTo: 'Cliente',
  },
  {
    id: '5',
    transactionId: '11',
    transactionDescription: 'DEPOSITO IDENTIFICADO',
    transactionValue: 12500,
    type: 'categorization',
    question: 'Identifique a origem e categoria deste depósito',
    priority: 'high',
    status: 'in_progress',
    createdAt: '2026-01-25T11:00:00',
    dueAt: '2026-01-30T18:00:00',
    assignedTo: 'Operador BPO',
  },
  {
    id: '6',
    transactionId: '12',
    transactionDescription: 'UBER CORPORATIVO',
    transactionValue: -245.50,
    type: 'review',
    question: 'Revise a sugestão de categoria: Transporte',
    priority: 'low',
    status: 'pending',
    createdAt: '2026-01-25T15:00:00',
    dueAt: '2026-02-05T18:00:00',
    assignedTo: 'Cliente',
  },
  {
    id: '7',
    transactionId: '8',
    transactionDescription: 'PAGTO SALARIOS - FOLHA JAN/26',
    transactionValue: -85000,
    type: 'attachment',
    question: 'Anexe o relatório da folha de pagamento',
    priority: 'medium',
    status: 'resolved',
    createdAt: '2026-01-27T08:00:00',
    dueAt: '2026-01-28T18:00:00',
    assignedTo: 'Cliente',
    resolvedAt: '2026-01-28T10:30:00',
    resolvedBy: 'Cliente',
    response: 'Arquivo anexado: folha_jan26.pdf',
  },
];

export const pendencyTypeLabels: Record<PendencyType, string> = {
  categorization: 'Categorização',
  attachment: 'Anexo',
  cost_center: 'Centro de Custo',
  approval: 'Aprovação',
  review: 'Revisão',
};

export const pendencyPriorityLabels: Record<PendencyPriority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};
