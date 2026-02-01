# 11 - Segurança e Privacidade

## Estado atual

- Não há autenticação/autorização.
- Não há coleta real de dados do usuário.
- Não existem variáveis de ambiente consumidas via `import.meta.env` no `src/` atualmente.

## Boas práticas ao evoluir

- Evitar logar dados sensíveis no console.
- Tratar anexos (comprovantes) como dados potencialmente sensíveis.
- Definir política de permissões por perfil (cliente vs operador vs admin).
- Implementar proteção contra XSS/CSRF quando houver backend.

## Observação

`src/pages/NotFound.tsx` escreve um `console.error` com a rota não encontrada, útil em dev, mas pode ser ajustado em produção.
