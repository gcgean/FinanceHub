// Mock data for transactions

export type TransactionStatus = 'novo' | 'sugerido' | 'pendente' | 'aprovado' | 'revisado' | 'travado';
export type TransactionType = 'receita' | 'despesa';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  value: number;
  type: TransactionType;
  category: string;
  categoryConfidence?: number;
  account: string;
  status: TransactionStatus;
  costCenter?: string;
  attachmentUrl?: string;
  notes?: string;
}

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: '2026-01-30',
    description: 'RECEBIMENTO PIX - CLIENTE ABC LTDA',
    value: 15000,
    type: 'receita',
    category: 'Receitas de Vendas',
    categoryConfidence: 98,
    account: 'Banco do Brasil',
    status: 'aprovado',
    costCenter: 'Comercial',
  },
  {
    id: '2',
    date: '2026-01-30',
    description: 'PAGTO BOLETO - FORNECEDOR XYZ',
    value: -8500,
    type: 'despesa',
    category: 'Fornecedores',
    categoryConfidence: 95,
    account: 'Banco do Brasil',
    status: 'aprovado',
    costCenter: 'Operacional',
  },
  {
    id: '3',
    date: '2026-01-29',
    description: 'TRANSF PIX JOSE MARIA',
    value: -1200,
    type: 'despesa',
    category: '',
    account: 'Itaú',
    status: 'pendente',
    notes: 'Aguardando categorização do cliente',
  },
  {
    id: '4',
    date: '2026-01-29',
    description: 'TED RECEBIDA - CONTRATO 2024/001',
    value: 45000,
    type: 'receita',
    category: 'Receitas de Serviços',
    categoryConfidence: 92,
    account: 'Itaú',
    status: 'sugerido',
    costCenter: 'Projetos',
  },
  {
    id: '5',
    date: '2026-01-28',
    description: 'DEB AUTOMATICO - CEMIG ENERGIA',
    value: -1850.45,
    type: 'despesa',
    category: 'Despesas com Energia',
    categoryConfidence: 99,
    account: 'Banco do Brasil',
    status: 'aprovado',
    costCenter: 'Administrativo',
    attachmentUrl: '/placeholder.svg',
  },
  {
    id: '6',
    date: '2026-01-28',
    description: 'COMPRA CARTAO - MATERIAL ESCRITORIO',
    value: -350,
    type: 'despesa',
    category: 'Material de Escritório',
    categoryConfidence: 85,
    account: 'Nubank',
    status: 'sugerido',
    costCenter: 'Administrativo',
  },
  {
    id: '7',
    date: '2026-01-27',
    description: 'MENSALIDADE - CLIENTE PREMIUM',
    value: 4500,
    type: 'receita',
    category: 'Receitas Recorrentes',
    categoryConfidence: 100,
    account: 'Banco do Brasil',
    status: 'travado',
    costCenter: 'Comercial',
  },
  {
    id: '8',
    date: '2026-01-27',
    description: 'PAGTO SALARIOS - FOLHA JAN/26',
    value: -85000,
    type: 'despesa',
    category: 'Folha de Pagamento',
    categoryConfidence: 100,
    account: 'Itaú',
    status: 'travado',
    costCenter: 'RH',
  },
  {
    id: '9',
    date: '2026-01-26',
    description: 'PIX RECEBIDO - VENDA PRODUTO X',
    value: 2800,
    type: 'receita',
    category: 'Receitas de Vendas',
    categoryConfidence: 88,
    account: 'Nubank',
    status: 'revisado',
    costCenter: 'Comercial',
  },
  {
    id: '10',
    date: '2026-01-26',
    description: 'TARIFA BANCARIA - PACOTE SERVICOS',
    value: -89.90,
    type: 'despesa',
    category: 'Despesas Bancárias',
    categoryConfidence: 100,
    account: 'Banco do Brasil',
    status: 'aprovado',
    costCenter: 'Financeiro',
  },
  {
    id: '11',
    date: '2026-01-25',
    description: 'DEPOSITO IDENTIFICADO',
    value: 12500,
    type: 'receita',
    category: '',
    account: 'Itaú',
    status: 'novo',
  },
  {
    id: '12',
    date: '2026-01-25',
    description: 'UBER CORPORATIVO',
    value: -245.50,
    type: 'despesa',
    category: 'Transporte',
    categoryConfidence: 78,
    account: 'Nubank',
    status: 'sugerido',
    costCenter: 'Comercial',
  },
];

export const categories = [
  'Receitas de Vendas',
  'Receitas de Serviços',
  'Receitas Recorrentes',
  'Fornecedores',
  'Folha de Pagamento',
  'Despesas com Energia',
  'Material de Escritório',
  'Despesas Bancárias',
  'Transporte',
  'Marketing',
  'Tecnologia',
  'Impostos',
];

export const accounts = ['Banco do Brasil', 'Itaú', 'Nubank', 'Santander', 'Caixa'];

export const costCenters = ['Comercial', 'Operacional', 'Administrativo', 'Financeiro', 'RH', 'Projetos', 'Marketing'];
