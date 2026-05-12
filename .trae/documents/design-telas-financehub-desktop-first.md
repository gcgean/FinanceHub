# Design de Telas (Desktop-first) — FinanceHub (MVP)

## Global Styles
- Layout: Grid para páginas (container central 1200px) + Flexbox para barras e listas.
- Tokens: fundo #0B1220; superfícies #101A2E; bordas #1F2A44; texto #E7EEF9; texto secundário #9FB0CC.
- Acentos: primary #4F8CFF; success #23C483; danger #FF4D4F; warning #FFB020.
- Tipografia: 14px base; títulos 24/20/16; números em variante tabular.
- Componentes: botões (primary/secondary/ghost), inputs com foco visível, chips de filtro, tabelas responsivas.

## Padrões de Página
- Header fixo (altura ~56px): logo “FinanceHub”, navegação (Dashboard, Transações, Configurações), menu do usuário (sair).
- Conteúdo: 2 colunas quando útil (ex.: dashboard) e 1 coluna para formulários.
- Estados: loading (skeleton), empty state (CTA “Adicionar transação”), erro com mensagem clara.

---

## 1) Página /auth (Autenticação)
### Meta Information
- title: “Entrar — FinanceHub”
- description: “Acesse sua conta para controlar suas finanças.”

### Estrutura
- Card central (max 420px) em superfície; tabs “Entrar” e “Criar conta”.
- Form: email, senha; CTA primário.
- Links: “Esqueci minha senha”; feedback inline de validação.

### Interações
- Após login: redirecionar para /dashboard.

---

## 2) Página /dashboard
### Meta Information
- title: “Dashboard — FinanceHub”
- description: “Resumo do seu período selecionado.”

### Estrutura (Grid 12 col)
- Linha 1: seletor de período (mês) à esquerda; botão “Nova transação” à direita.
- Linha 2: 3 cards (Receitas, Despesas, Saldo).
- Linha 3 (2 colunas):
  - Coluna A (7/12): gráfico simples/stack “Despesas por categoria” (pode iniciar como lista ordenada).
  - Coluna B (5/12): lista “Saldos por conta” com valor e ação “Ver transações”.

---

## 3) Página /transactions (Transações)
### Meta Information
- title: “Transações — FinanceHub”
- description: “Liste e registre receitas e despesas.”

### Estrutura
- Topbar: filtros (período, conta, categoria, tipo) + busca por descrição.
- Conteúdo: tabela (Data, Descrição, Conta, Categoria, Tipo, Valor) com ações (Editar/Excluir).
- Drawer/Modal “Nova/Editar transação”: data, tipo, valor, conta, categoria (opcional), descrição (opcional).

### Regras visuais
- Valor: verde para income, vermelho para expense; alinhamento à direita.

---

## 4) Página /settings (Configurações)
### Meta Information
- title: “Configurações — FinanceHub”
- description: “Gerencie contas e categorias.”

### Estrutura
- Layout 2 colunas com tabs internas:
  - Coluna esquerda: “Contas” / “Categorias”.
  - Coluna direita: lista + formulário inline (criar/editar).
- Contas: nome, moeda, saldo inicial, arquivar/reativar.
- Categorias: nome, tipo (income/expense), cor, arquivar/reativar.