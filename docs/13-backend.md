# 13 - Backend (API)

## Objetivo

O backend do FinanceHub fornece uma API REST com autenticação JWT e persistência em banco (SQLite via Prisma), suportando as entidades usadas pela UI: empresas, usuários, transações, pendências e importações.

O código fica em `backend/`.

## Stack

- Fastify
- Prisma + SQLite
- JWT (`@fastify/jwt`)
- Upload multipart (`@fastify/multipart`) + static (`@fastify/static`)
- Zod (validação)

## Como rodar

### Banco (Postgres via Docker)

No diretório raiz do projeto:

```bash
docker compose up -d
```

Adminer (opcional): `http://127.0.0.1:8080`.

1) Criar o arquivo `.env` a partir do exemplo:

```bash
cp backend/.env.example backend/.env
```

2) Ajustar `JWT_SECRET` (mínimo 16 caracteres) e, se quiser, `PORT`.

3) Instalar dependências e preparar o banco:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

4) Subir o servidor:

```bash
npm run dev
```

Por padrão: `http://127.0.0.1:4000`.

## Endpoints principais

- `GET /health`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/register` (admin)
- `GET /companies` (admin)
- `GET /companies/me`
- `GET /users`
- `GET /transactions`
- `POST /transactions`
- `GET /pendencies`
- `POST /pendencies`
- `POST /pendencies/:id/resolve`
- `GET /imports`
- `POST /imports/excel` (upload)
- `POST /imports/receipts` (upload)
- `POST /imports/api`
- `GET /ai/predictive-metrics`
- `GET /ai/insights`

### Módulos trazidos do CILOS_FINANCE

- `GET /accounts`
- `POST /accounts`
- `PATCH /accounts/:id`
- `GET /accounts/types`
- `GET /cost-centers`
- `POST /cost-centers`
- `PATCH /cost-centers/:id`
- `GET /chart-accounts` (pode incluir globais)
- `POST /chart-accounts`
- `PATCH /chart-accounts/:id`
- `DELETE /chart-accounts/:id`
- `GET /ledger`
- `POST /ledger`
- `PUT /ledger/:id`
- `DELETE /ledger/:id` (soft delete)
- `POST /ledger/:id/confirm`
- `GET /reports/statement`
- `POST /reports/dre/run`

## Autenticação

Use o header:

```
Authorization: Bearer <token>
```

## Escopo de empresa (compatível com CILOS)

Para usuários `ADMIN`, é possível informar a empresa via header:

```
X-Company-Id: <companyId>
```

Para `OPERATOR`/`CLIENT`, o escopo vem do `companyId` do próprio usuário.

## Usuários seed

Após rodar `npm run seed`, existem contas de exemplo:

- Admin: `admin@financehub.local` / `admin123`
- Operador: `operador@financehub.local` / `operator123`
- Cliente: `cliente@financehub.local` / `client123`

## Uploads

Uploads são gravados em `backend/uploads/` e servidos via `/uploads/*`.
