# 10 - Build e Deploy

## Build

```bash
npm run build
```

Saída padrão do Vite: `dist/`.

## Preview local do build

```bash
npm run preview
```

## Deploy

O projeto é um frontend estático e pode ser publicado em qualquer host de arquivos estáticos (ex.: Vercel, Netlify, Cloudflare Pages, S3 + CloudFront).

Pontos de atenção ao publicar:

- Configurar fallback de SPA (para o caso de rotas futuras por URL). Hoje só existe `/`, mas é recomendável preparar.
- Garantir cache adequado para assets do Vite.
