# 08 - Desenvolvimento

## Instalação e execução

```bash
npm install
npm run dev
```

Para iniciar front + back juntos:

```bash
npm run dev:all
```

Se a porta padrão estiver ocupada, o Vite sobe automaticamente em outra porta e imprime a URL correta no terminal (ex.: `http://localhost:5174`).

Para fixar uma porta específica:

```bash
npm run dev -- --port 5174
```

Se o backend estiver em outra porta/host, configure `VITE_API_URL` (por exemplo, `http://127.0.0.1:3000`).

Observação: o backend usa Postgres. Se você utiliza Docker, o Docker Desktop/daemon precisa estar rodando para o Postgres subir.

O servidor de desenvolvimento é configurado em `vite.config.ts`:

- Host `0.0.0.0`
- Porta `5173`

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
