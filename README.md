# FinanceHub

Frontend SPA para um painel de **BPO Financeiro**, com páginas de Dashboard, Transações, Pendências, Importações e um módulo de “IA” (mock) para insights/forecast/chat.

## Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI)
- React Router (apenas rota `/` e `*` no estado atual)
- TanStack Query (provider pronto, mas ainda sem chamadas HTTP no código)
- Recharts (gráficos)
- Vitest + Testing Library (testes)

## Começar

Pré-requisitos: Node.js + npm.

```bash
npm install
npm run dev
```

Por padrão o dev server sobe em `http://localhost:8080/` (configurado em `vite.config.ts`).

## Scripts

- `npm run dev`: servidor de desenvolvimento
- `npm run build`: build de produção
- `npm run preview`: servir o build localmente
- `npm run lint`: lint (ESLint)
- `npm run test`: testes (Vitest)

## Documentação

- [docs/README.md](./docs/README.md)

## Observações importantes

- A navegação principal do app não usa URL: as telas são trocadas por estado local em `src/pages/Index.tsx`.
- Os dados exibidos são mockados em `src/data/*`.
