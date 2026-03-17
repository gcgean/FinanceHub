# FinanceHub — Handoff para ChatGPT

## Visão geral
FinanceHub é uma plataforma de BPO financeiro com frontend SPA, backend REST e banco PostgreSQL. Também há um integrador Delphi que sincroniza dados do ERP/Firebird para o backend.

## Stack
- Frontend: React 18 + TypeScript + Vite, Tailwind + shadcn/ui, TanStack Query
- Backend: Node.js + TypeScript, Fastify, Zod, Prisma
- Banco: PostgreSQL 16 (Docker Compose), Adminer opcional
- Integrador: Delphi (Aplicativo Integracao)

## Como rodar
### Banco
```bash
docker compose up -d db
```
Postgres: 127.0.0.1:5432  
Adminer: http://127.0.0.1:8080

### Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```
Servidor: http://127.0.0.1:4000

### Frontend
```bash
npm install
npm run dev
```
Servidor: http://localhost:8080 (pode cair em 8081/8082 se ocupado)

## Variáveis de ambiente (backend)
Exemplo:
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

## Autenticação
- Login: POST /auth/login → retorna { token, user }
- Header: Authorization: Bearer <token>
- Escopo de empresa: x-company-id quando necessário
- Credenciais dev: admin@financehub.local / admin123

## Rotas principais
Prefixos registrados em backend/src/index.ts:
- /auth, /companies, /users, /accounts, /cost-centers, /chart-accounts
- /ledger, /reports, /transactions, /pendencies, /imports, /ai
- /customers, /suppliers, /products, /inventory, /ap-titles, /ar-titles
- /sales, /sale-items, /payment-methods, /sellers, /cashiers

## Módulo de Inteligência Artificial (FinanceHub AI)
A camada de IA transforma o FinanceHub de um BPO passivo para um consultor ativo.
- **RAG e Memória**: `AIMemory` armazena o contexto da empresa (fatos, dados de clientes) para enriquecer o prompt da IA.
- **Chat**: O usuário conversa com a IA e o histórico é persistido nas tabelas `AIChat` e `AIMessage`.
- **Métricas e Insights**: Snapshots diários das métricas financeiras (`AIMetricSnapshot`) são usados pela IA para responder perguntas sobre o estado financeiro da empresa.
- **Agentes Autônomos (Tasks)**: A IA pode decidir (via Function Calling/JSON) disparar tarefas em background (`AITask`), como "Análise Profunda", que roda assíncronamente e gera um resultado ou relatório PDF (`/ai/reports/financial`).
- **LLM Providers**: O módulo possui interfaces para se comunicar com OpenAI, Anthropic e Google Gemini, definidos pelas variáveis de ambiente.

## Integração Delphi
Pasta: Aplicativo Integracao
- uFinanceHubAPI.pas: client HTTP
- uSyncService.pas: rotinas de sync (clientes, fornecedores, produtos, contas a pagar/receber, vendas)
- uMain.pas/uMain.dfm: UI do integrador

Endpoints usados pelo integrador:
- /auth/login
- /companies
- /customers, /customers/classifications
- /suppliers
- /products, /products/sections, /products/groups, /products/subgroups, /products/manufacturers
- /ap-titles, /ar-titles
- /sales, /sale-items, /payment-methods, /sellers, /cashiers

### Fluxo de sincronização (alto nível)
1. Login na API → recebe token JWT
2. Resolve/seleciona empresa → envia x-company-id
3. Sincroniza cadastros base:
   - Empresas, Contas, Centros de custo, Plano de contas
   - Clientes e classificações de clientes
   - Fornecedores
   - Produtos (seções, grupos, subgrupos, fabricantes, itens)
4. Sincroniza movimentação:
   - Vendas + itens + pagamentos
   - Contas a pagar / contas a receber

### Exemplo de payloads (integrador → API)
#### Produto (POST /products)
```json
{
  "externalId": "123",
  "code": "000123",
  "sku": "SKU-123",
  "barcode": "7890000000000",
  "name": "Produto Exemplo",
  "section": "BEBIDAS",
  "group": "REFRIGERANTES",
  "subgroup": "COLA",
  "brandName": "Marca X",
  "costPrice": 10.5,
  "salePrice": 18.9,
  "active": true
}
```

#### Contas a Receber (POST /ar-titles)
```json
{
  "externalId": "CTR-1001-1",
  "customerExternalId": "200",
  "issueDate": "2026-03-01",
  "dueDate": "2026-03-10",
  "paymentDate": "2026-03-05",
  "amount": 120.5,
  "openAmount": 0,
  "paidAmount": 120.5,
  "discountReceived": 5,
  "interestReceived": 0,
  "status": "PAID",
  "documentNumber": "NF-123",
  "notes": "Recebido no caixa"
}
```

#### Contas a Pagar (POST /ap-titles)
```json
{
  "externalId": "CPT-1001-1",
  "supplierExternalId": "300",
  "issueDate": "2026-03-01",
  "dueDate": "2026-03-10",
  "paymentDate": "2026-03-05",
  "amount": 120.5,
  "openAmount": 0,
  "paidAmount": 120.5,
  "discountReceived": 5,
  "interestReceived": 0,
  "status": "PAID",
  "documentNumber": "NF-123",
  "notes": "Pago"
}
```

## Estrutura de pastas
Frontend:
- src/pages (Index.tsx controla navegação por estado)
- src/components (módulos e UI)
- src/api (clients)
- src/utils/api.ts (cliente HTTP)

Backend:
- backend/src/index.ts (registra rotas)
- backend/src/routes/* (endpoints)
- backend/src/modules/ai/* (Serviços, Controladores e Rotas do módulo de Inteligência Artificial)
- backend/src/lib/* (auth/env/prisma/validation)
- backend/prisma/schema.prisma (schema)

## Observações úteis
- O frontend usa currentPage em Index.tsx, não URL routing por página.
- O backend usa Prisma como única camada de acesso ao banco.
- Se houver erro “Cannot reach database server at 127.0.0.1:5432”, garanta Docker/Postgres em execução.
