# 11 - Segurança e Privacidade

## Estado Atual

A aplicação implementa um sistema de autenticação e autorização robusto baseado em JSON Web Tokens (JWT). As configurações sensíveis são gerenciadas através de variáveis de ambiente, validadas no início da aplicação para garantir que todos os segredos necessários estejam presentes.

### Gerenciamento de Segredos
- **`DATABASE_URL`**: A string de conexão com o banco de dados é carregada de variáveis de ambiente.
- **`JWT_SECRET`**: O segredo para assinar os tokens JWT é carregado de variáveis de ambiente. **É crucial que um segredo forte e único seja usado em produção.**
- **`FRONTEND_ORIGIN`**: A política de CORS é configurada para permitir requisições apenas da URL do frontend definida no ambiente.

### Vulnerabilidades Conhecidas

Durante a auditoria de segurança (`npm audit`), foram identificadas as seguintes vulnerabilidades:

#### Vulnerabilidade `xlsx` (Risco Aceito)
- **ID:** [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6), [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)
- **Gravidade:** Alta
- **Descrição:** Prototype Pollution e ReDoS na biblioteca SheetJS.
- **Decisão:** **Risco Aceito.** A funcionalidade de importação de planilhas é restrita a usuários com perfil de **Administrador**, que são considerados confiáveis e só manuseiam arquivos internos. A vulnerabilidade não tem uma correção automática disponível no momento. O risco será monitorado e a biblioteca será atualizada assim que uma correção for lançada.

#### Outras Vulnerabilidades
- Existem **11 vulnerabilidades de gravidade moderada** pendentes, a maioria relacionada a dependências de desenvolvimento (`eslint`, `vite`). Como essas dependências não fazem parte do build de produção, o risco para a aplicação em execução é considerado baixo. A decisão é **aceitar o risco residual** por enquanto e reavaliar as vulnerabilidades periodicamente, aplicando correções assim que se tornarem disponíveis através de atualizações padrão dos pacotes.

## Boas Práticas
- Evitar logar dados sensíveis no console em ambiente de produção.
- Tratar anexos (comprovantes) como dados potencialmente sensíveis.
- Manter as dependências atualizadas e executar auditorias de segurança regularmente.
