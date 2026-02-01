# 09 - Testes

## Stack de testes

- Vitest
- Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)

## Configuração

- `vitest.config.ts` usa `jsdom` e `setupFiles: ["./src/test/setup.ts"]`.
- Os testes ficam em `src/**/*.{test,spec}.{ts,tsx}`.

## Executar

```bash
npm run test
npm run test:watch
```
