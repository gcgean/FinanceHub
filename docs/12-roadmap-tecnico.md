# 12 - Roadmap Técnico

## Próximos passos naturais

1) Rotas reais por URL

- Migrar de `currentPage` (estado local) para rotas do React Router.
- Permitir deep-link e refresh mantendo a tela.

2) Integração com API

- Criar camada de services (`src/services/*`).
- Conectar TanStack Query (`useQuery/useMutation`).
- Implementar estados de loading/erro e retries.

3) Autenticação e autorização

- Login e sessão.
- RBAC (admin, operador, cliente).

4) Observabilidade e qualidade

- Padronizar logs.
- Testes de componentes/fluxos críticos.
- E2E (ex.: Playwright) quando houver backend.
