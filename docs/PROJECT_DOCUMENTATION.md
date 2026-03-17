# FinanceHub — Documentação Completa do Projeto

## 1. Visão Geral
FinanceHub é uma plataforma de BPO financeiro com frontend SPA e backend REST. O sistema integra dados de ERP via integrador Delphi, armazena informações financeiras em PostgreSQL e oferece um módulo de Inteligência Artificial para análises, chat, notificações e automação de tarefas.

Principais objetivos:
- Centralizar operações financeiras (transações, pendências, importações, cadastros e relatórios).
- Oferecer visualização e análise de indicadores financeiros em tempo real.
- Ativar um consultor financeiro inteligente com IA (chat, insights, notificações e tarefas autônomas).

## 2. Stack e Tecnologias
**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI)
- TanStack Query
- Recharts
- Vitest

**Backend**
- Node.js + TypeScript
- Fastify
- Zod
- Prisma
- JWT Auth

**Banco**
- PostgreSQL 16 (Docker Compose)
- Adminer opcional

**Integração**
- Integrador Delphi para sincronização com ERP/Firebird

**IA**
- OpenAI, Anthropic e Google Gemini
- RAG com memórias persistidas
- Agentes autônomos (AITask)
- Relatórios PDF
- Notificações multicanal

## 3. Arquitetura Geral
**Frontend SPA**
- Navegação por estado local no `Index.tsx`
- Componentes modulares (Dashboard, Insights, Chat, etc.)
- Comunicação via API REST

**Backend**
- Fastify com rotas modulares
- Prisma como camada única de persistência
- Jobs e workers internos para IA e sincronização

**Integração ERP**
- Delphi sincroniza cadastros e movimentações usando endpoints REST

## 4. Como Rodar o Projeto

### Banco de Dados
```bash
docker compose up -d db
```
- Postgres: `127.0.0.1:5432`
- Adminer: `http://127.0.0.1:8080`

### Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```
- Servidor: `http://127.0.0.1:4000`

### Frontend
```bash
npm install
npm run dev
```
- Servidor: `http://localhost:8080` (pode subir em 8081/8082 se ocupado)

## 5. Variáveis de Ambiente
**Backend (.env)**
```
DATABASE_URL="postgresql://financehub:financehub@127.0.0.1:5432/financehub?schema=public"
HOST=127.0.0.1
PORT=4000
FRONTEND_ORIGIN=http://127.0.0.1:8080
JWT_SECRET=change_me_change_me_change_me

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

## 6. Autenticação e Usuários
- Login: `POST /auth/login` retorna `{ token, user }`
- Header obrigatório: `Authorization: Bearer <token>`
- Escopo da empresa: `X-Company-Id`

**Credenciais seed**
- Admin: `admin@financehub.local` / `admin123`
- Operador: `operador@financehub.local` / `operator123`
- Cliente: `cliente@financehub.local` / `client123`

## 7. Estrutura de Pastas
**Frontend**
- `src/pages` — Páginas
- `src/components` — Componentes e UI
- `src/api` — Clientes HTTP
- `src/utils/api.ts` — Wrapper de API

**Backend**
- `backend/src/index.ts` — Registro de rotas
- `backend/src/routes/*` — Endpoints
- `backend/src/modules/ai/*` — Módulo IA
- `backend/src/lib/*` — Auth/env/prisma/validation
- `backend/prisma/schema.prisma` — Schema Prisma

## 8. Backend — Rotas Principais
**Core**
- `/auth`, `/companies`, `/users`
- `/transactions`, `/pendencies`, `/imports`
- `/accounts`, `/cost-centers`, `/chart-accounts`
- `/ledger`, `/reports`

**ERP Canonical**
- `/customers`, `/suppliers`, `/products`, `/inventory`
- `/ap-titles`, `/ar-titles`
- `/sales`, `/sale-items`, `/payment-methods`, `/sellers`, `/cashiers`

**IA**
- `POST /ai/chat`
- `GET /ai/chat`
- `GET /ai/chat/:id`
- `POST /ai/chat/:id/message`
- `POST /ai/memories`
- `GET /ai/memories`
- `GET /ai/memories/search`
- `POST /ai/insights/snapshot`
- `GET /ai/insights/history`
- `GET /ai/insights/context`
- `GET /ai/predictive-metrics`
- `GET /ai/insights`
- `POST /ai/tasks`
- `GET /ai/tasks`
- `POST /ai/tasks/worker/run`
- `GET /ai/reports/financial`
- `POST /ai/index-master-data`
- `GET /ai/notifications`
- `PUT /ai/notifications/:id/read`
- `PUT /ai/notifications/read-all`
- `GET /ai/notifications/channels`
- `POST /ai/notifications/channels`
- `DELETE /ai/notifications/channels/:id`

## 9. Módulo de Inteligência Artificial (FinanceHub AI)

### 9.1. Camadas
- **Memória**: `AIMemory` guarda contexto e fatos relevantes
- **RAG**: Recupera contexto para enriquecer respostas
- **Chat Persistente**: `AIChat` + `AIMessage`
- **Insights Preditivos**: `AIMetricSnapshot`
- **Agentes Autônomos**: `AITask` em background
- **Notificações**: `AINotificationChannel` e `AINotificationLog`

### 9.2. Providers de LLM
- OpenAI (GPT-4)
- Anthropic (Claude 3.5)
- Google Gemini

Seleção automática do provider baseada na variável de ambiente disponível.

### 9.3. Tarefas Autônomas
- Tarefas são criadas no `AITask` e enfileiradas no `BackgroundJob`
- Worker interno processa tarefas `FINANCIAL_ANALYSIS` e `CATEGORIZATION`
- Interface no frontend permite iniciar tarefas e acompanhar status

### 9.4. Notificações
- Disparo automático após criação de `AIInsightEvent`
- Canais disponíveis: Email, WhatsApp, Telegram, In-App
- Interface de configuração no frontend em **Configurações > Notificações**
- Alertas visíveis no sininho do Header (popover)

### 9.5. Relatórios
- PDF via `ReportService`
- Endpoint: `GET /ai/reports/financial`
- Botão de download no frontend em **Relatórios**

## 10. Estrutura de Dados (IA)
Tabelas criadas no Prisma:
- `AIProfile`
- `AISector`
- `AIMemory`
- `AIDocument`
- `AIChat`
- `AIMessage`
- `AIMetricSnapshot`
- `AITask`
- `AIInsightRule`
- `AIInsightEvent`
- `AIInsightRecipient`
- `AIInsightFeedback`
- `AINotificationChannel`
- `AINotificationLog`
- `BackgroundJob`

## 11. Integração Delphi
**Pasta:** `Aplicativo Integracao`

Componentes principais:
- `uFinanceHubAPI.pas`: Client HTTP
- `uSyncService.pas`: Rotinas de sync

Fluxo resumido:
1. Login → Token JWT
2. Seleciona empresa → `X-Company-Id`
3. Sincroniza cadastros base
4. Sincroniza movimentação

## 12. Scripts e Comandos
**Frontend**
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`

**Backend**
- `npm run dev`
- `npm run build`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run seed`
- `npx ts-node scripts/verify-ai.ts`
- `npx tsx scripts/generate-ai-test-data.ts`

## 13. Observações Importantes
- O frontend não usa URL routing para navegação principal, apenas estado interno.
- IA usa busca híbrida (keyword + re-ranking) enquanto vetores não forem ativados.
- `POST /ai/tasks/worker/run` deve ser protegido em produção.
- Backend roda em `4000`, frontend em `8080`.

## 14. Próximos Passos Sugeridos
- Implementar busca vetorial com pgvector
- Criar dashboards avançados de insights
- Adicionar monitoramento e logs estruturados
- Endurecer segurança para rotas de tasks/worker
