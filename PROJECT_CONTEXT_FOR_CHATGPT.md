# FinanceHub — Contexto Completo do Projeto (Frontend + Backend + Banco)

Este documento resume **toda a arquitetura e contratos** do FinanceHub para você colar no ChatGPT e obter ajuda com desenvolvimento, debugging e evolução do sistema.

## 1) Visão geral

**FinanceHub** é uma SPA para operação de BPO financeiro, com:

- Dashboard
- Cadastros financeiros (**Contas**, **Centros de custo**, **Plano de contas**)
- **Livro-caixa** (lançamentos, confirmação, remoção lógica)
- **Relatórios** (Extrato e DRE)
- Transações / Pendências / Importações / módulo “IA” (endpoints reais no backend)

O backend é uma API REST com **JWT**, validação com **Zod**, acesso ao banco via **Prisma** e banco **PostgreSQL** rodando em **Docker**.

## 2) Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind + shadcn/ui (Radix)
- TanStack React Query

### Backend
- Node.js + TypeScript
- Fastify
- @fastify/jwt (JWT)
- Prisma
- Vitest (testes)

### Banco
- PostgreSQL 16 (via Docker Compose)
- Adminer (opcional) para inspeção visual do banco

## 3) Como rodar localmente (dev)

### 3.1 Banco (Docker)

Na raiz do projeto:

```bash
docker compose up -d
```

- Postgres: `127.0.0.1:5432`
- Adminer: `http://127.0.0.1:8080`
  - System: `PostgreSQL`
  - Server: `db`
  - Username: `financehub`
  - Password: `financehub`
  - Database: `financehub`

### 3.2 Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Servidor (por padrão): `http://127.0.0.1:4000`

### 3.3 Frontend

```bash
npm install
npm run dev
```

UI (por padrão): `http://127.0.0.1:5173`

## 4) Variáveis de ambiente

### Backend (`backend/.env`)
- `DATABASE_URL` (Postgres)
- `JWT_SECRET` (mín. 16 chars)
- `FRONTEND_ORIGIN` (CORS)
- `HOST` / `PORT`

Exemplo (dev):

```env
DATABASE_URL="postgresql://financehub:financehub@127.0.0.1:5432/financehub?schema=public"
HOST=127.0.0.1
PORT=4000
FRONTEND_ORIGIN=http://127.0.0.1:5173
JWT_SECRET=change_me_change_me_change_me
```

### Frontend (`VITE_API_URL`)
- `VITE_API_URL` (opcional): URL base do backend. Se ausente, usa `http://127.0.0.1:4000`.

## 5) Fluxo de autenticação e escopo de empresa

### JWT
- Login: `POST /auth/login` → retorna `{ token, user }`.
- Todas as rotas protegidas exigem `Authorization: Bearer <token>`.

### Escopo de empresa
- O frontend envia `x-company-id` quando existe `companyId` selecionado no store.
- Em usuários não-admin, o `companyId` normalmente vem do próprio usuário.

## 6) Navegação do frontend

O app **não usa rotas URL por página**; troca de tela é por estado local `currentPage` em `src/pages/Index.tsx`.

Login é feito em `src/pages/Login.tsx` e o gate de autenticação em `src/components/auth/AuthGate.tsx`.

## 7) Cliente HTTP do frontend

Todas as chamadas HTTP são centralizadas em `src/utils/api.ts`:

- Base URL: `VITE_API_URL` (fallback `http://127.0.0.1:4000`)
- Headers automáticos:
  - `authorization: Bearer <token>`
  - `x-company-id: <companyId>` (quando definido)
- Erros: backend responde `{ error: "CODE" }`; o frontend lança `ApiResponseError` com `status` e `code`.

## 8) Endpoints do backend (rotas registradas)

Prefixos registrados em `backend/src/index.ts`:

- `/health`
- `/auth`
- `/companies`
- `/users`
- `/transactions`
- `/pendencies`
- `/imports`
- `/ai`
- `/accounts`
- `/cost-centers`
- `/chart-accounts`
- `/ledger`
- `/reports`

### 8.1 Rotas principais usadas pelo frontend

#### Auth
- `POST /auth/login` `{ email, password }`
- `GET /auth/me`

#### Empresas
- `GET /companies/me` → `{ company: Company | null }` (para ADMIN retorna `{ company: null }`)
- `GET /companies` (ADMIN)

#### Cadastros financeiros
- `GET /accounts/types`
- `GET /accounts`
- `POST /accounts`
- `PATCH /accounts/:id`

- `GET /cost-centers`
- `POST /cost-centers`
- `PATCH /cost-centers/:id`

- `GET /chart-accounts` (+ query `includeGlobal=true`)
- `POST /chart-accounts`
- `PATCH /chart-accounts/:id`
- `DELETE /chart-accounts/:id`

#### Livro-caixa
- `GET /ledger` (filtros em query: `dateFrom/dateTo/accountId/confirmed/deleted/withSplits`)
- `POST /ledger`
- `PUT /ledger/:id`
- `POST /ledger/:id/confirm` `{ confirmed: boolean }`
- `DELETE /ledger/:id`

#### Relatórios
- `GET /reports/statement` (query: `dateFrom/dateTo/accountId/confirmed/operation`)
- `POST /reports/dre/run` `{ dateFrom, dateTo }`

## 9) Banco de dados (Prisma / Postgres)

### 9.1 Principais entidades

Trechos relevantes do schema (`backend/prisma/schema.prisma`):

- `Company`: empresas
- `User`: usuários com `role` (ADMIN/OPERATOR/CLIENT)
- `AccountType` / `Account`: contas bancárias (cadastro)
- `CostCenter`: centros de custo
- `ChartAccount`: plano de contas (hierarquia + flags de DRE/cashflow)
- `BankLedgerEntry` + `BankLedgerEntrySplit`: lançamentos do livro-caixa e seus “splits” (rateio por plano/centro)
- `Transaction`: transações (módulo geral)
- `Pendency`: pendências ligadas a uma transação
- `ImportJob`: fila de importações (Excel/Receipt/API)

### 9.2 Observações importantes

- `Account.code` e `CostCenter.code` são únicos por empresa (`@@unique([companyId, code])`).
- `ChartAccount.companyId` pode ser `null` para “conta global” (apenas ADMIN consegue criar).
- Livro-caixa tem remoção lógica por `deletedAt`.

## 10) Seeds / credenciais de dev

O seed é executado por `backend/prisma/seed.ts`.

Credencial dev (utilizada nos testes e no setup):
- `admin@financehub.local` / `admin123`

## 11) Testes automatizados

Backend (Vitest) com testes de integração via `app.inject()`:

- Arquivo: `backend/src/routes.integration.test.ts`
- Cobre: Auth, Companies, Accounts, Cost Centers, Chart Accounts, Ledger, Reports, Transactions, Pendencies, Imports, AI

Rodar:

```bash
cd backend
npm run test
```

## 12) Estrutura de pastas (resumo)

### Frontend
- `src/pages/*` páginas (render via `Index.tsx`)
- `src/components/*` componentes (ui, layout, modules)
- `src/api/*` clients por domínio (finance/ledger/reports)
- `src/utils/api.ts` cliente HTTP central
- `src/stores/authStore.ts` token e companyId

### Backend
- `backend/src/index.ts` registra plugins/rotas
- `backend/src/routes/*` rotas
- `backend/src/lib/*` auth/env/prisma/validation
- `backend/prisma/schema.prisma` schema
- `docker-compose.yml` Postgres + Adminer

## 13) Pontos de atenção já tratados

- Frontend (Radix Select): removidos `SelectItem value=""` para evitar crash (usando sentinelas como `all`, `__none__`, `__default__`).
- Backend: `POST/PATCH /accounts` retornam campos extras (`typeDescription`, `balance`) para compatibilidade com o frontend.
- Backend: `POST /reports/dre/run` retorna linhas com campos completos para bater com o tipo do frontend.

---

Se você (ChatGPT) precisar ajudar, considere:
- O frontend usa `currentPage` e não URL routing por página.
- O escopo de empresa pode vir do JWT e/ou do header `x-company-id`.
- O banco é Postgres em Docker; Prisma é o único caminho de acesso ao DB.

