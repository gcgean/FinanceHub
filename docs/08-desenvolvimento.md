# 08 - Desenvolvimento

## Instalação e execução

```bash
npm install
npm run dev
```

O servidor de desenvolvimento é configurado em `vite.config.ts`:

- Host `::`
- Porta `8080`

## Alias de imports

`@` resolve para `./src` (Vite e Vitest). Exemplo:

- `import { Button } from "@/components/ui/button"`

## Scripts (package.json)

- `dev`: Vite dev server
- `build`: build de produção
- `build:dev`: build em modo development
- `preview`: servir build
- `lint`: ESLint
- `test` / `test:watch`: Vitest

## Padrões e convenções do código

- Páginas em `src/pages/*`.
- Componentes de layout em `src/components/layout/*`.
- Componentes por feature em `src/components/{dashboard,ai,imports}/*`.
- Componentes shadcn/ui em `src/components/ui/*`.

## Lovable tagger

O `vite.config.ts` habilita `lovable-tagger` em modo `development`. Isso injeta metadados úteis para ferramentas que integram com Lovable.
