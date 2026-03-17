# Manual do Módulo de Inteligência Artificial (FinanceHub)

## 1. Visão Geral
O módulo de IA do FinanceHub foi projetado para fornecer insights financeiros, automação de tarefas e um assistente virtual inteligente. Ele opera integrado ao backend (Node.js/Fastify) e banco de dados (PostgreSQL/Prisma).

## 2. Arquitetura
- **Modelos de IA:** Suporte a OpenAI (GPT-4), Anthropic (Claude 3.5) e Google (Gemini 1.5). Configurado via variáveis de ambiente.
- **RAG (Retrieval-Augmented Generation):** O sistema utiliza a tabela `AIMemory` para armazenar contexto relevante (clientes, fornecedores, fatos aprendidos) e injetá-los no prompt do chat.
- **Agentes Autônomos:** O `TaskService` permite a execução de tarefas assíncronas (ex: "Análise Financeira Profunda") processadas em background.

## 3. Funcionalidades Principais

### 3.1. Chat Financeiro
- **Localização:** Aba "Chat com IA" na página de Inteligência Artificial.
- **Uso:** Pergunte sobre saldo, inadimplência, previsões ou peça análises.
- **Contexto:** O chat sabe sobre as métricas financeiras dos últimos 7 dias automaticamente.

### 3.2. Dashboard de Tarefas
- **Localização:** Aba "Dashboard Preditivo".
- **Uso:** Acompanhe o status de tarefas solicitadas ao chat (ex: "Gere um relatório completo").

### 3.3. Insights e Métricas
- **Snapshots:** O sistema gera snapshots diários de Receita, Despesa e Resultado.
- **Previsões:** Algoritmos simples de projeção (30d, 90d, 12m) baseados em histórico.

## 4. Configuração (Desenvolvedores)

### 4.1. Variáveis de Ambiente (.env)
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GEMINI_API_KEY=...
```

### 4.2. Comandos Úteis
- **Verificar Instalação:** `npx ts-node scripts/verify-ai.ts`
- **Gerar Prisma Client:** `npx prisma generate`
- **Rodar Migrações:** `npx prisma migrate dev`

## 5. Estrutura de Banco de Dados (Novas Tabelas)
- `AIProfile`: Configurações globais.
- `AIMemory`: Memória de longo prazo.
- `AIChat` / `AIMessage`: Histórico de conversas.
- `AITask`: Fila de tarefas autônomas.
- `AIMetricSnapshot`: Histórico de KPIs.
