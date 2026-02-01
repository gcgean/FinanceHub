# 03 - Estrutura de Pastas

## Raiz

- `src/`: código da aplicação
- `public/`: arquivos estáticos
- `index.html`: HTML base do Vite
- `vite.config.ts`: config do Vite (alias, server, plugins)
- `tailwind.config.ts`: tokens e tema
- `components.json`: configuração do shadcn/ui
- `vitest.config.ts`: config de testes

## `src/`

- `main.tsx`: bootstrap React
- `App.tsx`: providers + rotas
- `pages/`: páginas do app
- `components/`:
  - `layout/`: Sidebar/Header
  - `dashboard/`: widgets do Dashboard
  - `ai/`: widgets do módulo de IA
  - `imports/`: widgets da Central de Importações
  - `ui/`: componentes shadcn/ui
- `data/`: dados mockados e tipos
- `lib/utils.ts`: utilitários (ex.: `cn`)
- `hooks/`: hooks compartilhados
- `test/`: setup e exemplos de testes
