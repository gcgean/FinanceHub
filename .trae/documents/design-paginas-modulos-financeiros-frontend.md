# Design de Páginas — Módulos Financeiros (desktop-first)

## 0) Padrões globais
**Layout**: Shell com Sidebar fixa à esquerda + Header no topo (layout atual). Conteúdo em coluna com espaçamento `gap-4/6`, cards shadcn (`<Card/>`) e tabelas (`<Table/>`).

**Meta (base)**
- title: `FinanceHub — Gestão Financeira`
- description: `Cadastros financeiros, livro-caixa e relatórios por empresa.`
- og:title/og:description: espelhar title/description.

**Global Styles (tokens)**
- Background: `bg-background` (tema do tailwind/shadcn)
- Texto: `text-foreground`, secundário `text-muted-foreground`
- Ação primária: `<Button variant="default"/>`; destrutivo: `variant="destructive"`
- Links: `text-primary hover:underline`
- Estados: loading com `<Skeleton/>`; erro com `<Alert variant="destructive"/>`

**Responsivo**
- Desktop-first: tabelas completas ≥1024px.
- ≤768px: colunas menos relevantes viram “detalhes” em drawer/dialog; filtros vão para `<Sheet/>`.

---

## 1) Dashboard (atalhos)
**Meta**
- title: `FinanceHub — Dashboard`

**Page Structure**
- Seção de KPIs existente + nova seção “Módulos Financeiros”.

**Seções & Componentes**
1. Cards de atalho (grid 3 colunas desktop)
   - Card “Cadastros Financeiros” (descrição curta + botão “Abrir”).
   - Card “Livro-caixa”.
   - Card “Relatórios”.
2. Interação
   - Clique no card/botão dispara navegação interna (ajusta `currentPage`).

---

## 2) Cadastros Financeiros (tabs)
**Meta**
- title: `FinanceHub — Cadastros Financeiros`

**Layout**
- Coluna principal com header da página + tabs (`<Tabs/>`).

**Page Structure**
- Header: título + ações globais (ex.: “Novo” muda conforme tab).
- Tabs: `Contas` | `Centros de Custo` | `Plano de Contas`.

**Seções & Componentes**
1. Barra de ações (topo)
   - `<Input/>` de pesquisa (nome/código).
   - Botão “Novo …” abre `<Dialog/>` com formulário.
   - Indicador de carregamento (spinner/skeleton).
2. Tabela de listagem (por tab)
   - `<Table/>` com paginação simples (se necessário) e estado vazio.
   - Linhas com ações “Editar” e, quando aplicável, “Excluir”.
3. Formulário (Dialog)
   - Implementar com `react-hook-form` + `zod`.
   - Campos essenciais:
     - Contas: nome, código(opc.), tipo (select carregado de `/accounts/types`), ativo.
     - Centro de custo: nome, código(opc.), ativo.
     - Plano de contas: código, nome, nível/parent(opc., conforme backend), ativo.
4. Exclusão (somente Plano de Contas)
   - `<AlertDialog/>` confirmando impacto + ação destrutiva.

**Estados**
- Erro de permissão (401/403): alerta + CTA “Reautenticar”.

---

## 3) Livro-caixa
**Meta**
- title: `FinanceHub — Livro-caixa`

**Layout**
- Header + barra de filtros + tabela de lançamentos.

**Page Structure**
- Filtros em linha (desktop): período, status, conta, centro de custo.
- Ações: “Novo lançamento”.

**Seções & Componentes**
1. Filtros
   - Período: `<DatePicker/>` (início/fim).
   - Status: `<Select/>` (Pendente/Confirmado/Todos).
   - Conta/Centro de custo: `<Select/>` com busca (carregados dos cadastros).
2. Tabela de lançamentos
   - Colunas: Data, Histórico, Conta, Centro de custo, Valor, Status, Ações.
   - Valor com cor: positivo `text-emerald-600`, negativo `text-rose-600`.
3. Ações por linha
   - “Editar” (Dialog formulário).
   - “Confirmar” (se Pendente) com feedback (toast).
   - “Remover” (AlertDialog) — indicar “remoção lógica” quando aplicável.
4. Formulário de lançamento (Dialog)
   - Campos: data, histórico/descrição, valor, conta(opc.), centro de custo(opc.).

---

## 4) Relatórios
**Meta**
- title: `FinanceHub — Relatórios`

**Layout**
- Tabs: `Extrato` | `DRE`.

**Seções & Componentes**
1. Tab Extrato (Statement)
   - Filtros: período + conta(opcional).
   - Botão “Gerar”.
   - Resultado: tabela com linhas e (se vier do backend) saldo acumulado; card de totais.
2. Tab DRE (Run)
   - Filtros: período.
   - Botão “Executar DRE”.
   - Resultado: árvore/tabela hierárquica (linhas com indentação por nível).

**Interações e feedback**
- Todas as chamadas via `react-query` com cache por chave (empresa + filtros).
- Toaster para sucesso/erro; skeleton durante carregamento.
