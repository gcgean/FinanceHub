# Checklist de Qualidade - FinanceHub AI

## Arquitetura e Banco de Dados
- [ ] O `schema.prisma` compila sem erros?
- [ ] As migrações foram aplicadas com sucesso em um banco limpo?
- [ ] As novas entidades possuem índices adequados (`@@index`) para performance?
- [ ] As relações entre `Company` e as entidades de IA estão corretas (Multi-tenant)?

## Backend (Node/Fastify)
- [ ] A estrutura de pastas em `modules/ai` está sendo seguida?
- [ ] Os serviços de IA estão desacoplados dos controladores (Dependency Injection ou Singleton)?
- [ ] As chaves de API (OpenAI/Anthropic) estão em variáveis de ambiente (`.env`) e não no código?
- [ ] O tratamento de erros da API de IA é robusto (retries, fallbacks)?

## Funcionalidade
- [ ] O chat persiste o histórico corretamente entre sessões?
- [ ] A memória de longo prazo é consultada antes de responder?
- [ ] Os snapshots de métricas são gerados na periodicidade correta?
- [ ] O sistema respeita o escopo de dados da empresa (Tenant Isolation)?

## Testes
- [ ] Testes unitários para `MemoryService` e `ChatService`?
- [ ] Testes de integração para as rotas de IA?
