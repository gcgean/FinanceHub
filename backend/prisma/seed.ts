import "dotenv/config";
import {
  PrismaClient,
  UserRole,
  TransactionStatus,
  TransactionType,
  PendencyPriority,
  PendencyStatus,
  PendencyType,
  ImportSource,
  ImportStatus,
  LedgerOperation,
  ChartPlanType,
  RevenueExpense,
  DebitCredit,
  FixedVariable,
  CostExpense,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const toDate = (isoDate: string) => new Date(isoDate);

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@financehub.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const company = await prisma.company.upsert({
    where: { cnpj: "12.345.678/0001-90" },
    update: { name: "Tech Solutions Ltda" },
    create: { name: "Tech Solutions Ltda", cnpj: "12.345.678/0001-90" },
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: "Admin", role: UserRole.ADMIN, passwordHash },
    create: { email: adminEmail, name: "Admin", role: UserRole.ADMIN, passwordHash, companyId: company.id },
  });

  const operatorPasswordHash = await bcrypt.hash("operator123", 10);
  await prisma.user.upsert({
    where: { email: "operador@financehub.local" },
    update: { name: "João da Silva", role: UserRole.OPERATOR, passwordHash: operatorPasswordHash, companyId: company.id },
    create: { email: "operador@financehub.local", name: "João da Silva", role: UserRole.OPERATOR, passwordHash: operatorPasswordHash, companyId: company.id },
  });

  const clientPasswordHash = await bcrypt.hash("client123", 10);
  await prisma.user.upsert({
    where: { email: "cliente@financehub.local" },
    update: { name: "Cliente", role: UserRole.CLIENT, passwordHash: clientPasswordHash, companyId: company.id },
    create: { email: "cliente@financehub.local", name: "Cliente", role: UserRole.CLIENT, passwordHash: clientPasswordHash, companyId: company.id },
  });

  const txs = [
    {
      id: "tx1",
      date: "2026-01-30",
      description: "RECEBIMENTO PIX - CLIENTE ABC LTDA",
      value: 15000,
      type: TransactionType.REVENUE,
      category: "Receitas de Vendas",
      categoryConfidence: 98,
      account: "Banco do Brasil",
      status: TransactionStatus.APPROVED,
      costCenter: "Comercial",
    },
    {
      id: "tx3",
      date: "2026-01-29",
      description: "TRANSF PIX JOSE MARIA",
      value: -1200,
      type: TransactionType.EXPENSE,
      category: "",
      account: "Itaú",
      status: TransactionStatus.PENDING,
      notes: "Aguardando categorização do cliente",
    },
    {
      id: "tx5",
      date: "2026-01-28",
      description: "DEB AUTOMATICO - CEMIG ENERGIA",
      value: -1850.45,
      type: TransactionType.EXPENSE,
      category: "Despesas com Energia",
      categoryConfidence: 99,
      account: "Banco do Brasil",
      status: TransactionStatus.APPROVED,
      costCenter: "Administrativo",
      attachmentUrl: "/placeholder.svg",
    },
  ] as const;

  for (const tx of txs) {
    await prisma.transaction.upsert({
      where: { id: tx.id },
      update: {
        companyId: company.id,
        date: toDate(tx.date),
        description: tx.description,
        value: tx.value,
        type: tx.type,
        category: tx.category,
        categoryConfidence: tx.categoryConfidence ?? null,
        account: tx.account,
        status: tx.status,
        costCenter: (tx as any).costCenter ?? null,
        attachmentUrl: (tx as any).attachmentUrl ?? null,
        notes: (tx as any).notes ?? null,
      },
      create: {
        id: tx.id,
        companyId: company.id,
        date: toDate(tx.date),
        description: tx.description,
        value: tx.value,
        type: tx.type,
        category: tx.category,
        categoryConfidence: tx.categoryConfidence ?? null,
        account: tx.account,
        status: tx.status,
        costCenter: (tx as any).costCenter ?? null,
        attachmentUrl: (tx as any).attachmentUrl ?? null,
        notes: (tx as any).notes ?? null,
      },
    });
  }

  await prisma.pendency.upsert({
    where: { id: "p1" },
    update: {
      companyId: company.id,
      transactionId: "tx3",
      type: PendencyType.CATEGORIZATION,
      question: "Qual a categoria desta transação?",
      priority: PendencyPriority.HIGH,
      status: PendencyStatus.OVERDUE,
      assignedTo: "Cliente",
      dueAt: toDate("2026-01-29T18:00:00"),
    },
    create: {
      id: "p1",
      companyId: company.id,
      transactionId: "tx3",
      type: PendencyType.CATEGORIZATION,
      question: "Qual a categoria desta transação?",
      priority: PendencyPriority.HIGH,
      status: PendencyStatus.OVERDUE,
      assignedTo: "Cliente",
      dueAt: toDate("2026-01-29T18:00:00"),
    },
  });

  await prisma.importJob.upsert({
    where: { id: "i1" },
    update: {
      companyId: company.id,
      source: ImportSource.EXCEL,
      status: ImportStatus.DONE,
      filename: "extrato_jan_2026.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      resultJson: JSON.stringify({ imported: 42 }),
    },
    create: {
      id: "i1",
      companyId: company.id,
      source: ImportSource.EXCEL,
      status: ImportStatus.DONE,
      filename: "extrato_jan_2026.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      resultJson: JSON.stringify({ imported: 42 }),
    },
  });

  await prisma.accountType.upsert({
    where: { code: "001" },
    update: { description: "CAIXA" },
    create: { code: "001", description: "CAIXA" },
  });
  await prisma.accountType.upsert({
    where: { code: "002" },
    update: { description: "COFRE" },
    create: { code: "002", description: "COFRE" },
  });
  const bankType = await prisma.accountType.upsert({
    where: { code: "003" },
    update: { description: "BANCO" },
    create: { code: "003", description: "BANCO" },
  });

  const accountBanco = await prisma.account.upsert({
    where: { companyId_code: { companyId: company.id, code: "01" } },
    update: { description: "Banco do Brasil", accountTypeId: bankType.id },
    create: {
      companyId: company.id,
      code: "01",
      description: "Banco do Brasil",
      accountTypeId: bankType.id,
      active: true,
      useInCashFlow: true,
      superOnly: false,
      defaultConfirmed: false,
    },
  });

  const ccAdm = await prisma.costCenter.upsert({
    where: { companyId_code: { companyId: company.id, code: "ADM" } },
    update: { description: "Administrativo" },
    create: { companyId: company.id, code: "ADM", description: "Administrativo", active: true },
  });

  const caReceitas = await prisma.chartAccount.upsert({
    where: { id: "ca_receitas" },
    update: {
      companyId: company.id,
      code: "1",
      description: "Receitas",
      planType: ChartPlanType.SINTETICA,
      revenueExpense: RevenueExpense.RECEITA,
      debitCredit: DebitCredit.CREDITO,
      fixedVariable: FixedVariable.VARIAVEL,
      costExpense: CostExpense.DESPESA,
    },
    create: {
      id: "ca_receitas",
      companyId: company.id,
      code: "1",
      description: "Receitas",
      planType: ChartPlanType.SINTETICA,
      revenueExpense: RevenueExpense.RECEITA,
      debitCredit: DebitCredit.CREDITO,
      fixedVariable: FixedVariable.VARIAVEL,
      costExpense: CostExpense.DESPESA,
    },
  });

  const caVendas = await prisma.chartAccount.upsert({
    where: { id: "ca_vendas" },
    update: {
      companyId: company.id,
      code: "1.01",
      description: "Receitas de Vendas",
      planType: ChartPlanType.ANALITICA,
      parentId: caReceitas.id,
      revenueExpense: RevenueExpense.RECEITA,
      debitCredit: DebitCredit.CREDITO,
      fixedVariable: FixedVariable.VARIAVEL,
      costExpense: CostExpense.DESPESA,
    },
    create: {
      id: "ca_vendas",
      companyId: company.id,
      code: "1.01",
      description: "Receitas de Vendas",
      planType: ChartPlanType.ANALITICA,
      parentId: caReceitas.id,
      revenueExpense: RevenueExpense.RECEITA,
      debitCredit: DebitCredit.CREDITO,
      fixedVariable: FixedVariable.VARIAVEL,
      costExpense: CostExpense.DESPESA,
    },
  });

  const caDespesas = await prisma.chartAccount.upsert({
    where: { id: "ca_despesas" },
    update: {
      companyId: company.id,
      code: "2",
      description: "Despesas",
      planType: ChartPlanType.SINTETICA,
      revenueExpense: RevenueExpense.DESPESA,
      debitCredit: DebitCredit.DEBITO,
      fixedVariable: FixedVariable.FIXO,
      costExpense: CostExpense.DESPESA,
    },
    create: {
      id: "ca_despesas",
      companyId: company.id,
      code: "2",
      description: "Despesas",
      planType: ChartPlanType.SINTETICA,
      revenueExpense: RevenueExpense.DESPESA,
      debitCredit: DebitCredit.DEBITO,
      fixedVariable: FixedVariable.FIXO,
      costExpense: CostExpense.DESPESA,
    },
  });

  const caEnergia = await prisma.chartAccount.upsert({
    where: { id: "ca_energia" },
    update: {
      companyId: company.id,
      code: "2.01",
      description: "Despesas com Energia",
      planType: ChartPlanType.ANALITICA,
      parentId: caDespesas.id,
      revenueExpense: RevenueExpense.DESPESA,
      debitCredit: DebitCredit.DEBITO,
      fixedVariable: FixedVariable.FIXO,
      costExpense: CostExpense.DESPESA,
    },
    create: {
      id: "ca_energia",
      companyId: company.id,
      code: "2.01",
      description: "Despesas com Energia",
      planType: ChartPlanType.ANALITICA,
      parentId: caDespesas.id,
      revenueExpense: RevenueExpense.DESPESA,
      debitCredit: DebitCredit.DEBITO,
      fixedVariable: FixedVariable.FIXO,
      costExpense: CostExpense.DESPESA,
    },
  });

  const ledgerEntrada = await prisma.bankLedgerEntry.upsert({
    where: { id: "le1" },
    update: {
      companyId: company.id,
      code: 1,
      issueDate: toDate("2026-01-30T00:00:00"),
      paymentDate: null,
      accountId: accountBanco.id,
      amount: 15000,
      operation: LedgerOperation.CREDITO,
      history: "Recebimento PIX - Cliente ABC",
      confirmed: true,
      printOnClose: false,
    },
    create: {
      id: "le1",
      companyId: company.id,
      code: 1,
      issueDate: toDate("2026-01-30T00:00:00"),
      paymentDate: null,
      accountId: accountBanco.id,
      amount: 15000,
      operation: LedgerOperation.CREDITO,
      history: "Recebimento PIX - Cliente ABC",
      confirmed: true,
      printOnClose: false,
    },
  });

  await prisma.bankLedgerEntrySplit.deleteMany({ where: { entryId: ledgerEntrada.id } });
  await prisma.bankLedgerEntrySplit.create({
    data: {
      entryId: ledgerEntrada.id,
      chartAccountId: caVendas.id,
      costCenterId: ccAdm.id,
      splitAmount: 15000,
    },
  });

  const ledgerSaida = await prisma.bankLedgerEntry.upsert({
    where: { id: "le2" },
    update: {
      companyId: company.id,
      code: 2,
      issueDate: toDate("2026-01-28T00:00:00"),
      paymentDate: null,
      accountId: accountBanco.id,
      amount: 1850.45,
      operation: LedgerOperation.DEBITO,
      history: "CEMIG ENERGIA",
      confirmed: true,
      printOnClose: false,
    },
    create: {
      id: "le2",
      companyId: company.id,
      code: 2,
      issueDate: toDate("2026-01-28T00:00:00"),
      paymentDate: null,
      accountId: accountBanco.id,
      amount: 1850.45,
      operation: LedgerOperation.DEBITO,
      history: "CEMIG ENERGIA",
      confirmed: true,
      printOnClose: false,
    },
  });

  await prisma.bankLedgerEntrySplit.deleteMany({ where: { entryId: ledgerSaida.id } });
  await prisma.bankLedgerEntrySplit.create({
    data: {
      entryId: ledgerSaida.id,
      chartAccountId: caEnergia.id,
      costCenterId: ccAdm.id,
      splitAmount: 1850.45,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
