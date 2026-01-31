// Mock data for AI-powered financial analysis

export interface RevenueData {
  month: string;
  faturamento: number;
  mensalidades: number;
  contasReceber: number;
  predicted?: boolean;
}

export interface ChurnRisk {
  id: string;
  cliente: string;
  tipo: 'mensalidade' | 'servico' | 'produto';
  valorMensal: number;
  risco: 'alto' | 'medio' | 'baixo';
  probabilidade: number;
  motivo: string;
  ultimoPagamento: string;
  diasAtraso: number;
}

export interface Opportunity {
  id: string;
  tipo: 'upsell' | 'cross-sell' | 'retencao' | 'expansao';
  cliente: string;
  produto: string;
  potencialReceita: number;
  probabilidade: number;
  acao: string;
  prazo: string;
}

export interface AIInsight {
  id: string;
  tipo: 'alerta' | 'oportunidade' | 'previsao' | 'tendencia';
  titulo: string;
  descricao: string;
  impacto: number;
  confianca: number;
  categoria: string;
  dataGeracao: string;
}

export interface PredictiveMetric {
  label: string;
  valorAtual: number;
  valorPrevisto30d: number;
  valorPrevisto90d: number;
  valorPrevisto12m: number;
  tendencia: 'up' | 'down' | 'stable';
  confianca: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Revenue historical + predicted data
export const revenueData: RevenueData[] = [
  { month: 'Jul/25', faturamento: 185000, mensalidades: 45000, contasReceber: 32000 },
  { month: 'Ago/25', faturamento: 192000, mensalidades: 47000, contasReceber: 28000 },
  { month: 'Set/25', faturamento: 198000, mensalidades: 48500, contasReceber: 35000 },
  { month: 'Out/25', faturamento: 215000, mensalidades: 52000, contasReceber: 29000 },
  { month: 'Nov/25', faturamento: 238000, mensalidades: 55000, contasReceber: 41000 },
  { month: 'Dez/25', faturamento: 275000, mensalidades: 58000, contasReceber: 38000 },
  { month: 'Jan/26', faturamento: 261000, mensalidades: 62000, contasReceber: 45000 },
  // Predictions
  { month: 'Fev/26', faturamento: 278000, mensalidades: 65000, contasReceber: 42000, predicted: true },
  { month: 'Mar/26', faturamento: 295000, mensalidades: 68000, contasReceber: 39000, predicted: true },
  { month: 'Abr/26', faturamento: 312000, mensalidades: 72000, contasReceber: 36000, predicted: true },
];

// Churn risk analysis
export const churnRisks: ChurnRisk[] = [
  {
    id: '1',
    cliente: 'Tech Solutions Ltda',
    tipo: 'mensalidade',
    valorMensal: 4500,
    risco: 'alto',
    probabilidade: 78,
    motivo: 'Reduziu interações em 60% nos últimos 30 dias',
    ultimoPagamento: '2025-12-15',
    diasAtraso: 45,
  },
  {
    id: '2',
    cliente: 'Comercial ABC',
    tipo: 'servico',
    valorMensal: 2800,
    risco: 'alto',
    probabilidade: 65,
    motivo: 'Ticket de suporte sem resolução há 20 dias',
    ultimoPagamento: '2026-01-05',
    diasAtraso: 25,
  },
  {
    id: '3',
    cliente: 'Indústria Norte',
    tipo: 'mensalidade',
    valorMensal: 8200,
    risco: 'medio',
    probabilidade: 45,
    motivo: 'Solicitou informações sobre cancelamento',
    ultimoPagamento: '2026-01-20',
    diasAtraso: 10,
  },
  {
    id: '4',
    cliente: 'Varejo Express',
    tipo: 'produto',
    valorMensal: 1500,
    risco: 'medio',
    probabilidade: 38,
    motivo: 'Padrão de uso decrescente nos últimos 60 dias',
    ultimoPagamento: '2026-01-25',
    diasAtraso: 5,
  },
  {
    id: '5',
    cliente: 'Serviços Integrados',
    tipo: 'mensalidade',
    valorMensal: 3200,
    risco: 'baixo',
    probabilidade: 15,
    motivo: 'Pequena redução no uso do sistema',
    ultimoPagamento: '2026-01-28',
    diasAtraso: 2,
  },
];

// Market opportunities
export const opportunities: Opportunity[] = [
  {
    id: '1',
    tipo: 'upsell',
    cliente: 'Distribuidora Sul',
    produto: 'Plano Enterprise',
    potencialReceita: 15000,
    probabilidade: 82,
    acao: 'Agendar demo do módulo avançado de relatórios',
    prazo: '15 dias',
  },
  {
    id: '2',
    tipo: 'cross-sell',
    cliente: 'Grupo Atacado',
    produto: 'Módulo Conciliação Bancária',
    potencialReceita: 8500,
    probabilidade: 75,
    acao: 'Apresentar ROI da automação de conciliação',
    prazo: '7 dias',
  },
  {
    id: '3',
    tipo: 'expansao',
    cliente: 'Rede Farmácias',
    produto: 'Licenças adicionais (3 filiais)',
    potencialReceita: 12000,
    probabilidade: 68,
    acao: 'Contatar sobre expansão para novas unidades',
    prazo: '30 dias',
  },
  {
    id: '4',
    tipo: 'retencao',
    cliente: 'Tech Solutions Ltda',
    produto: 'Desconto fidelidade 20%',
    potencialReceita: 3600,
    probabilidade: 55,
    acao: 'Oferecer renovação antecipada com desconto',
    prazo: '5 dias',
  },
  {
    id: '5',
    tipo: 'upsell',
    cliente: 'Construtora Alpha',
    produto: 'Módulo Projetos/Obras',
    potencialReceita: 6800,
    probabilidade: 71,
    acao: 'Demonstrar controle de custos por projeto',
    prazo: '20 dias',
  },
];

// AI-generated insights
export const aiInsights: AIInsight[] = [
  {
    id: '1',
    tipo: 'alerta',
    titulo: 'Risco de perda de R$ 54.000/ano',
    descricao: 'Identificados 3 clientes com alta probabilidade de churn. Ação imediata recomendada para retenção.',
    impacto: -54000,
    confianca: 85,
    categoria: 'Churn',
    dataGeracao: '2026-01-31',
  },
  {
    id: '2',
    tipo: 'oportunidade',
    titulo: 'Potencial de upsell de R$ 186.000/ano',
    descricao: '12 clientes identificados com perfil para upgrade. Taxa de conversão histórica: 35%.',
    impacto: 186000,
    confianca: 78,
    categoria: 'Vendas',
    dataGeracao: '2026-01-31',
  },
  {
    id: '3',
    tipo: 'previsao',
    titulo: 'Receita recorrente crescerá 18% em 90 dias',
    descricao: 'Baseado em tendência de aquisição e retenção, projetamos MRR de R$ 73.200 até abril.',
    impacto: 11200,
    confianca: 72,
    categoria: 'Receita',
    dataGeracao: '2026-01-31',
  },
  {
    id: '4',
    tipo: 'tendencia',
    titulo: 'Sazonalidade detectada: pico em março',
    descricao: 'Histórico indica aumento de 25% nas vendas em março. Recomenda-se preparar capacidade.',
    impacto: 65000,
    confianca: 88,
    categoria: 'Planejamento',
    dataGeracao: '2026-01-31',
  },
  {
    id: '5',
    tipo: 'alerta',
    titulo: 'Inadimplência acima da média do setor',
    descricao: 'Taxa atual de 12% vs média de 7%. Sugerimos revisar política de cobrança.',
    impacto: -28000,
    confianca: 91,
    categoria: 'Contas a Receber',
    dataGeracao: '2026-01-31',
  },
];

// Predictive metrics
export const predictiveMetrics: PredictiveMetric[] = [
  {
    label: 'Faturamento Total',
    valorAtual: 261000,
    valorPrevisto30d: 278000,
    valorPrevisto90d: 312000,
    valorPrevisto12m: 4200000,
    tendencia: 'up',
    confianca: 85,
  },
  {
    label: 'Receita Recorrente (MRR)',
    valorAtual: 62000,
    valorPrevisto30d: 65000,
    valorPrevisto90d: 72000,
    valorPrevisto12m: 95000,
    tendencia: 'up',
    confianca: 82,
  },
  {
    label: 'Contas a Receber',
    valorAtual: 45000,
    valorPrevisto30d: 42000,
    valorPrevisto90d: 36000,
    valorPrevisto12m: 28000,
    tendencia: 'down',
    confianca: 75,
  },
  {
    label: 'Taxa de Churn',
    valorAtual: 4.2,
    valorPrevisto30d: 3.8,
    valorPrevisto90d: 3.2,
    valorPrevisto12m: 2.5,
    tendencia: 'down',
    confianca: 68,
  },
];

// Sample chat history
export const sampleChatHistory: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Olá! Sou seu assistente de inteligência financeira. Posso ajudar você a entender tendências, identificar oportunidades e antecipar riscos no seu negócio. Como posso ajudar?',
    timestamp: '2026-01-31T09:00:00',
  },
];

// AI Chat suggested questions
export const suggestedQuestions = [
  'Quais clientes têm maior risco de cancelamento?',
  'Qual a previsão de faturamento para os próximos 3 meses?',
  'Onde estão as maiores oportunidades de vendas?',
  'Como está a saúde financeira da empresa?',
  'Quais ações devo priorizar esta semana?',
];
