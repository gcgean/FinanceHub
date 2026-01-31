// Mock data for import functionality

export interface ImportConnection {
  id: string;
  name: string;
  type: 'api' | 'excel' | 'ofx';
  status: 'active' | 'inactive' | 'error';
  lastSync: string;
  recordsImported: number;
}

export interface PendingImport {
  id: string;
  type: 'receipt' | 'excel' | 'api';
  fileName?: string;
  imageUrl?: string;
  status: 'pending' | 'processing' | 'analyzed' | 'error';
  uploadedAt: string;
  uploadedBy: string;
  aiAnalysis?: {
    confidence: number;
    suggestedCategory: string;
    suggestedValue: number;
    suggestedDate: string;
    suggestedDescription: string;
  };
}

export interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST';
  authType: 'bearer' | 'apikey' | 'basic' | 'none';
  schedule: 'manual' | 'hourly' | 'daily' | 'weekly';
  lastRun?: string;
  status: 'active' | 'inactive';
}

export const mockConnections: ImportConnection[] = [
  {
    id: '1',
    name: 'Banco do Brasil - OFX',
    type: 'ofx',
    status: 'active',
    lastSync: '2026-01-30T14:30:00',
    recordsImported: 1250,
  },
  {
    id: '2',
    name: 'Planilha Vendas - Excel',
    type: 'excel',
    status: 'active',
    lastSync: '2026-01-29T10:00:00',
    recordsImported: 450,
  },
  {
    id: '3',
    name: 'ERP Sistema X - API',
    type: 'api',
    status: 'active',
    lastSync: '2026-01-31T08:00:00',
    recordsImported: 3200,
  },
  {
    id: '4',
    name: 'Itaú Empresas - OFX',
    type: 'ofx',
    status: 'error',
    lastSync: '2026-01-28T16:45:00',
    recordsImported: 890,
  },
];

export const mockPendingImports: PendingImport[] = [
  {
    id: '1',
    type: 'receipt',
    fileName: 'comprovante_luz_jan.jpg',
    imageUrl: '/placeholder.svg',
    status: 'analyzed',
    uploadedAt: '2026-01-31T09:15:00',
    uploadedBy: 'Cliente',
    aiAnalysis: {
      confidence: 92,
      suggestedCategory: 'Despesas com Energia',
      suggestedValue: 1850.45,
      suggestedDate: '2026-01-15',
      suggestedDescription: 'CEMIG - Conta de Luz Janeiro/2026',
    },
  },
  {
    id: '2',
    type: 'receipt',
    fileName: 'nota_fiscal_material.jpg',
    imageUrl: '/placeholder.svg',
    status: 'processing',
    uploadedAt: '2026-01-31T10:30:00',
    uploadedBy: 'Cliente',
  },
  {
    id: '3',
    type: 'excel',
    fileName: 'vendas_janeiro.xlsx',
    status: 'analyzed',
    uploadedAt: '2026-01-30T16:00:00',
    uploadedBy: 'Operador BPO',
    aiAnalysis: {
      confidence: 88,
      suggestedCategory: 'Receitas de Vendas',
      suggestedValue: 45000,
      suggestedDate: '2026-01-30',
      suggestedDescription: 'Importação de 150 registros de vendas',
    },
  },
  {
    id: '4',
    type: 'receipt',
    fileName: 'boleto_fornecedor.pdf',
    imageUrl: '/placeholder.svg',
    status: 'pending',
    uploadedAt: '2026-01-31T11:00:00',
    uploadedBy: 'Cliente',
  },
  {
    id: '5',
    type: 'api',
    fileName: 'Sync ERP - 31/01',
    status: 'analyzed',
    uploadedAt: '2026-01-31T08:00:00',
    uploadedBy: 'Sistema',
    aiAnalysis: {
      confidence: 95,
      suggestedCategory: 'Múltiplas Categorias',
      suggestedValue: 125000,
      suggestedDate: '2026-01-31',
      suggestedDescription: '85 transações importadas via API',
    },
  },
];

export const mockAPIEndpoints: APIEndpoint[] = [
  {
    id: '1',
    name: 'ERP Sistema X',
    url: 'https://api.sistemax.com.br/v1/transactions',
    method: 'GET',
    authType: 'bearer',
    schedule: 'daily',
    lastRun: '2026-01-31T08:00:00',
    status: 'active',
  },
  {
    id: '2',
    name: 'PDV Vendas',
    url: 'https://api.pdvvendas.com/sales',
    method: 'GET',
    authType: 'apikey',
    schedule: 'hourly',
    lastRun: '2026-01-31T11:00:00',
    status: 'active',
  },
  {
    id: '3',
    name: 'Marketplace Integration',
    url: 'https://api.marketplace.com/orders',
    method: 'GET',
    authType: 'bearer',
    schedule: 'manual',
    status: 'inactive',
  },
];
