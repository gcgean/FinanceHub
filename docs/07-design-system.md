# 07 - Design System (UI)

## Tecnologias

- Tailwind CSS
- shadcn/ui (componentes em `src/components/ui/*`)
- Radix UI (primitivos)
- `lucide-react` (ícones)

## Tokens de tema

O tema usa CSS variables em `src/index.css` e o Tailwind referencia essas variáveis no `tailwind.config.ts`.

Exemplos de tokens:

- `--background`, `--foreground`
- `--primary`, `--secondary`, `--accent`
- `--sidebar-*`
- `--positive`, `--negative`, `--pending` (financeiros)

## Dark mode

- `darkMode: ["class"]`
- Para habilitar modo escuro, adicione/remova a classe `dark` no root apropriado.

## Componentes de UI

Os componentes em `src/components/ui/*` seguem o padrão do shadcn/ui e são consumidos nas páginas e features.

## Utilitário `cn`

`src/lib/utils.ts` exporta `cn` para composição de classes (Tailwind).
