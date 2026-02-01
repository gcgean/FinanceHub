# 02 - Arquitetura

## Visão geral

O app é um frontend React com Vite e TypeScript. A UI usa Tailwind + shadcn/ui (Radix). O desenho atual privilegia a composição por páginas e componentes, com dados mockados.

## Pontos de entrada

- `index.html`: contém o `#root`.
- `src/main.tsx`: inicializa o React e renderiza `<App />`.
- `src/App.tsx`: registra providers globais e rotas do React Router.

Fluxo simplificado:

```text
index.html -> main.tsx -> App.tsx
  -> QueryClientProvider (TanStack Query)
  -> TooltipProvider
  -> Toaster/Sonner
  -> BrowserRouter
      -> Route "/" -> pages/Index.tsx
      -> Route "*" -> pages/NotFound.tsx
```

## Navegação (URL vs estado)

Apesar de existir React Router, a troca de “telas” do menu principal não altera a URL.

- A URL permanece em `/`.
- `Index.tsx` mantém `currentPage` em `useState`.
- `Sidebar` chama `onPageChange(id)`.
- `Index.tsx` faz um `switch(currentPage)` para renderizar a página.

Isso significa:

- Não há deep-link por URL (ex.: abrir direto em Pendências via `/pendencies`).
- Um refresh do browser volta para o `currentPage` default (`dashboard`).

## Dados

Os dados exibidos são locais:

- `src/data/*` (mocks com tipos exportados).
- Alguns componentes usam arrays inline.

O TanStack Query está configurado em `App.tsx`, mas atualmente não há queries/mutations no código.

## Estilo e tema

- Tailwind com CSS variables definidas em `src/index.css`.
- `tailwind.config.ts` mapeia tokens (background/foreground/primary/sidebar/etc.) para `hsl(var(--...))`.
- Dark mode por classe (`darkMode: ["class"]`).

## Convenções

- Alias `@` aponta para `./src` (Vite e Vitest).
- Componentes de UI base ficam em `src/components/ui/*`.
- Componentes por domínio ficam em `src/components/{dashboard,ai,imports,layout}/*`.
