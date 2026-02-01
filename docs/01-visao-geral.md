# 01 - Visão Geral

## Objetivo

O FinanceHub é uma SPA (single-page application) que simula a operação de um **BPO Financeiro**: acompanhamento de indicadores, gestão de transações, pendências operacionais e central de importações.

O projeto, no estado atual, é predominantemente **UI/UX + fluxos locais** com dados mockados.

## Público-alvo

- Operador do BPO (interno): acompanha pendências, transações, status de fechamento.
- Cliente (externo): responde pendências (categoria, anexos, aprovações).

## Principais módulos

- Dashboard: cards de KPI + gráfico de fluxo de caixa + transações recentes.
- IA: visão preditiva (métricas, forecast, insights), churn, oportunidades e chat (mock).
- Transações: gestão/listagem (mock).
- Pendências: fila de itens que precisam de ação (cliente/operador).
- Importações: fila de análise + upload de comprovantes + import Excel + “conexão API” (mock).
- Administração: empresas, usuários e configurações (mock).

## Escopo atual (o que existe no código)

- UI completa e navegável dentro do app.
- Dados locais em `src/data/*` e alguns arrays inline.
- Roteamento mínimo (somente `/` e `*`).

## Fora de escopo atual (lacunas intencionais)

- Autenticação/autorização.
- Persistência/Backend/API (não há `fetch/axios/useQuery` para dados reais).
- URLs por página (deep link) e refresh mantendo rota.
