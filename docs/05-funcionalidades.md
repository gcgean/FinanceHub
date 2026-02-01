# 05 - Funcionalidades

## Dashboard

- KPIs de receita/despesa/resultado/pendências.
- Gráfico de fluxo de caixa.
- Lista de transações recentes.
- Widgets de pendências e status de fechamento.

Arquivos relevantes:

- `src/pages/Dashboard.tsx`
- `src/components/dashboard/*`

## Inteligência Artificial (mock)

Páginas e componentes para simular um módulo de IA:

- Métricas preditivas com seletor de horizonte (`30d/90d/12m`).
- Gráfico de receita histórica + previsão.
- Cartões de insights da IA.
- Tabelas de risco de churn e oportunidades.
- Chat com IA (simulado).
- Lista de “relatórios automáticos” (mock/in-memory).

Arquivos relevantes:

- `src/pages/AIInsights.tsx`
- `src/components/ai/*`
- `src/data/mockAIData.ts`

## Importações

Central de importações com tabs:

- Fila de análise.
- Upload de comprovantes.
- Upload Excel.
- “Conexão API”.

Arquivos relevantes:

- `src/pages/Imports.tsx`
- `src/components/imports/*`
- `src/data/mockImportData.ts`

## Pendências

Lista filtrável com dialog de resolução.

- Filtros por status/tipo.
- Indicadores por status.
- SLA (tempo até vencimento) usando `date-fns` com locale `ptBR`.
- Ação de resolução atualiza o estado local.

Arquivos relevantes:

- `src/pages/Pendencies.tsx`
- `src/data/mockPendenciesData.ts`

## Transações / Relatórios / Administração

As páginas existem e usam dados mockados.

- Transações: `src/pages/Transactions.tsx` + `src/data/mockTransactionsData.ts`
- Relatórios: `src/pages/Reports.tsx`
- Empresas/Usuários/Configurações: `src/pages/{Companies,Users,Settings}.tsx` + `src/data/mockAdminData.ts`
