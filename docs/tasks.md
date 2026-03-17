# Tarefas - Implementação do Módulo de IA

Baseado no roadmap de 12 fases para o FinanceHub AI.

- [ ] **Fase 1: Análise e Arquitetura** <!-- id: 1 -->
    - [x] Analisar o projeto atual e propor arquitetura (Spec). <!-- id: 1.1 -->
    - [ ] Criar estrutura de pastas `backend/src/modules/ai`. <!-- id: 1.2 -->
    - [ ] Definir interfaces para serviços de IA (LLM, Memory, RAG). <!-- id: 1.3 -->

- [ ] **Fase 2: Fundação de Dados (Prisma & DB)** <!-- id: 2 -->
    - [x] Adicionar entidade `AIProfile` e `AISector` ao schema. <!-- id: 2.1 -->
    - [x] Adicionar entidade `AIMemory` e `AIDocument` ao schema. <!-- id: 2.2 -->
    - [x] Adicionar entidade `AIChat` e `AIMessage` ao schema. <!-- id: 2.3 -->
    - [x] Adicionar entidade `AIMetricSnapshot` e `AITask` ao schema. <!-- id: 2.4 -->
    - [x] Gerar migração (`prisma migrate dev`) e aplicar. <!-- id: 2.5 -->
    - [x] Atualizar `PrismaClient` (`prisma generate`). <!-- id: 2.6 -->

- [ ] **Fase 3: Ingestão de Contexto (RAG Básico)** <!-- id: 3 -->
    - [x] Implementar `MemoryService` (CRUD de memórias). <!-- id: 3.1 -->
    - [x] Criar job para indexar dados mestres (Clientes, Fornecedores) como memórias textuais. <!-- id: 3.2 -->
    - [x] Criar endpoint para ingestão manual de conhecimento. <!-- id: 3.3 -->

- [ ] **Fase 4: Motor de Chat e LLM** <!-- id: 4 -->
    - [x] Implementar `LLMProvider` (integração OpenAI/Anthropic/Gemini). <!-- id: 4.1 -->
    - [x] Implementar `ChatService` (criação de sessões, persistência de mensagens). <!-- id: 4.2 -->
    - [x] Criar endpoint `POST /ai/chat` para interação. <!-- id: 4.3 -->

- [ ] **Fase 5: Métricas e Snapshots** <!-- id: 5 -->
    - [x] Implementar `InsightsService`. <!-- id: 5.1 -->
    - [x] Criar job diário para gerar `AIMetricSnapshot` (Receita, Despesa, Saldo). <!-- id: 5.2 -->
    - [x] Criar endpoint para consultar histórico de métricas. <!-- id: 5.3 -->

- [ ] **Fase 6: Integração com Frontend** <!-- id: 6 -->
    - [x] Criar componentes de UI para Chat (janela flutuante ou página dedicada). <!-- id: 6.1 -->
    - [x] Integrar UI com endpoints de Chat e Histórico. <!-- id: 6.2 -->

- [ ] **Fase 7: Agentes Autônomos (AITask)** <!-- id: 7 -->
    - [x] Implementar `TaskService` (Criação e Gestão de Tarefas). <!-- id: 7.1 -->
    - [x] Criar processador de tarefas (Worker) para executar análises em background. <!-- id: 7.2 -->
    - [x] Implementar agente de "Análise Profunda" (gera relatório completo de uma entidade). <!-- id: 7.3 -->
    - [x] Integrar Chat com criação de tarefas (Intent Recognition). <!-- id: 7.4 -->

- [ ] **Fase 9: Validação e Testes Finais** <!-- id: 9 -->
    - [x] Executar script de verificação do backend e banco de dados. <!-- id: 9.1 -->
    - [x] Verificar se todas as rotas de IA estão registradas e respondendo. <!-- id: 9.2 -->
    - [x] Consolidar documentação final. <!-- id: 9.3 -->

- [x] **Fase 10: Otimização de Busca (Vector-Ready)** <!-- id: 10 -->
    - [x] Refinar `MemoryService` para suportar busca híbrida (Keyword + Semantic Placeholder). <!-- id: 10.1 -->
    - [x] Implementar sistema de pontuação de relevância (Re-ranking) simples. <!-- id: 10.2 -->

- [x] **Fase 11: Relatórios Automatizados (PDF)** <!-- id: 11 -->
    - [x] Criar serviço de geração de PDF (`ReportService`) usando dados da IA. <!-- id: 11.1 -->
    - [x] Criar endpoint para baixar relatório de análise financeira. <!-- id: 11.2 -->

- [x] **Fase 12: Limpeza e Otimização Final** <!-- id: 12 -->
    - [x] Remover códigos de debug e logs excessivos. <!-- id: 12.1 -->
    - [x] Revisar tratamento de erros e timeouts. <!-- id: 12.2 -->
    - [x] Atualizar `CHATGPT_HANDOFF.md` com o estado final. <!-- id: 12.3 -->
