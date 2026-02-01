# 04 - Rotas e Navegação

## Rotas (React Router)

Definidas em `src/App.tsx`:

- `/` → `src/pages/Index.tsx`
- `*` → `src/pages/NotFound.tsx`

## Navegação interna (menu)

Em `src/pages/Index.tsx`, a navegação funciona por `currentPage` (estado local) e um `switch`.

Mapeamento (IDs do menu → páginas):

| Menu ID | Página |
|---|---|
| `dashboard` | `src/pages/Dashboard.tsx` |
| `aiInsights` | `src/pages/AIInsights.tsx` |
| `imports` | `src/pages/Imports.tsx` |
| `transactions` | `src/pages/Transactions.tsx` |
| `pendencies` | `src/pages/Pendencies.tsx` |
| `reports` | `src/pages/Reports.tsx` |
| `companies` | `src/pages/Companies.tsx` |
| `users` | `src/pages/Users.tsx` |
| `settings` | `src/pages/Settings.tsx` |

## Implicações

- O botão Voltar/Avançar do browser não troca telas internas.
- Não há compartilhamento de links para páginas internas.
- É um bom candidato para evoluir para rotas reais por URL (ver Roadmap).
