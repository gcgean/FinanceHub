# 06 - Dados Mock

## Visão geral

O projeto utiliza arquivos em `src/data/*` para representar entidades e listas exibidas na UI.

Esses arquivos exportam **tipos TS** e **arrays de exemplo**, o que facilita substituir por dados reais no futuro.

## `mockTransactionsData.ts`

- `Transaction`: entidade principal de movimentação.
- `TransactionStatus`: `novo | sugerido | pendente | aprovado | revisado | travado`.
- Listas auxiliares: `categories`, `accounts`, `costCenters`.

Campos relevantes de `Transaction`:

- `date`, `description`, `value`, `type` (`receita|despesa`)
- `category` e `categoryConfidence` (sugestão/IA)
- `status`, `account`, `costCenter`

## `mockPendenciesData.ts`

- `Pendency`: pendência associada a uma transação.
- `PendencyStatus`: `pending | in_progress | resolved | overdue`.
- Labels: `pendencyTypeLabels`, `pendencyPriorityLabels`.

## `mockAIData.ts`

Tipos e listas usadas no módulo de IA:

- `RevenueData` (histórico e previsão)
- `PredictiveMetric`
- `AIInsight`
- `ChurnRisk`
- `Opportunity`
- `ChatMessage`

## `mockImportData.ts` e `mockAdminData.ts`

- Estruturas auxiliares para as telas de importação e administração.

## Estratégia para substituir por dados reais

- Introduzir um módulo de API (ex.: `src/services/api/*`).
- Usar TanStack Query para cache e estados de loading/erro.
- Manter os tipos TS como contrato (ou gerar tipos via OpenAPI/GraphQL, se aplicável).
