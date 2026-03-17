# Especificação da Camada de Inteligência Artificial (FinanceHub AI)

Esta especificação define a arquitetura para o módulo de IA do FinanceHub, focado em memória de longo prazo, contexto financeiro (RAG) e insights preditivos.

## 1. Visão Geral

A camada de IA visa transformar o FinanceHub de um BPO passivo para um consultor financeiro ativo. A arquitetura suportará:
- **Memória de Longo Prazo:** Armazenar preferências, fatos históricos e decisões passadas.
- **Contexto RAG (Retrieval-Augmented Generation):** Indexar documentos e dados estruturados para respostas embasadas.
- **Chat Persistente:** Histórico de conversas por contexto (Financeiro, Fiscal, Vendas).
- **Insights Preditivos:** Análise de tendências baseada em snapshots históricos.

## 2. Entidades de Dados (Prisma Schema)

As seguintes novas entidades serão adicionadas ao `schema.prisma`:

### 2.1. Configuração e Perfil
- **AIProfile:** Configurações globais de IA para uma empresa (tom de voz, nível de detalhe, permissões).
- **AISector:** Segmentação de conhecimento (ex: "Financeiro", "Fiscal", "Vendas", "RH"). Permite direcionar perguntas para especialistas virtuais.

### 2.2. Memória e Conhecimento
- **AIMemory:** Unidade atômica de conhecimento. Pode ser um fato extraído ("Cliente X prefere boleto") ou uma regra de negócio ("Sempre aprovar despesas abaixo de R$ 50").
    - Campos: `content`, `embedding` (futuro pgvector), `tags`, `validUntil`, `confidence`.
- **AIDocument:** Referência a documentos processados (PDFs, Planilhas) que alimentam a base de conhecimento.
    - Relacionamento com `ImportFile` ou `Attachment`.

### 2.3. Conversação
- **AIChat:** Sessão de conversa entre usuário e assistente.
    - Campos: `title`, `context` (setor), `status` (ativo, arquivado).
- **AIMessage:** Mensagens individuais.
    - Campos: `role` (user/assistant/system), `content`, `tokensUsed`, `feedback` (like/dislike).

### 2.4. Métricas e Insights
- **AIMetricSnapshot:** Tabela para armazenar KPIs históricos (receita, despesa, lucro, inadimplência) em granularidade diária/semanal/mensal. Essencial para detectar tendências e anomalias.
    - Campos: `date`, `metricKey`, `value`, `granularity` (D/W/M).

### 2.5. Tarefas Autônomas
- **AITask:** Tarefas geradas ou executadas pela IA em background (ex: "Analisar fluxo de caixa da semana passada", "Categorizar novas transações").
    - Campos: `type`, `status`, `resultSummary`, `error`.

## 3. Relacionamentos

- `AIProfile` 1:1 `Company`
- `AISector` N:1 `Company`
- `AIMemory` N:1 `Company` (pode ser global ou específico de empresa)
- `AIChat` N:1 `User`, N:1 `Company`
- `AIMessage` N:1 `AIChat`
- `AIMetricSnapshot` N:1 `Company`

## 4. Estrutura de Pastas (Backend)

Recomendamos centralizar a lógica de IA em um módulo dedicado:

```
backend/src/
  modules/
    ai/
      services/
        - memory.service.ts      # Gerenciamento de memória (CRUD + busca)
        - chat.service.ts        # Gestão de conversas e contexto
        - rag.service.ts         # Indexação e recuperação de documentos
        - insights.service.ts    # Geração de snapshots e análise
        - llm.provider.ts        # Interface genérica para OpenAI/Anthropic
      controllers/
        - chat.controller.ts
        - memory.controller.ts
        - insights.controller.ts
      routes/
        - ai.routes.ts           # Definição dos endpoints
```

## 5. Fluxo de Dados

1.  **Ingestão:** Dados do ERP (via Delphi) chegam nas tabelas `Stg...`.
2.  **Processamento:** `SyncService` atualiza as entidades core (`Customer`, `Product`, etc.).
3.  **Indexação (Async):** Um job de IA monitora novos dados e cria/atualiza `AIMemory` ou `AIMetricSnapshot`.
4.  **Consulta:** O usuário faz uma pergunta no Chat.
5.  **Recuperação:** O `RAGService` busca memórias e documentos relevantes.
6.  **Geração:** O `LLMProvider` gera a resposta com base no contexto recuperado.
7.  **Armazenamento:** A interação é salva em `AIChat`/`AIMessage` para contexto futuro.

## 6. Próximos Passos (Fase 1 e 2)

1.  Atualizar `schema.prisma` com as novas entidades.
2.  Gerar migrações (`npx prisma migrate dev`).
3.  Criar a estrutura de pastas `modules/ai`.
4.  Implementar serviços básicos de CRUD para Memória e Chat.
