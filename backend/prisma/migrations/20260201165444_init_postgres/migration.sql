-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'CLIENT');

-- CreateEnum
CREATE TYPE "CompanyPlan" AS ENUM ('FREE', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('NEW', 'SUGGESTED', 'PENDING', 'APPROVED', 'REVIEWED', 'LOCKED');

-- CreateEnum
CREATE TYPE "PendencyType" AS ENUM ('CATEGORIZATION', 'ATTACHMENT', 'COST_CENTER', 'APPROVAL', 'REVIEW');

-- CreateEnum
CREATE TYPE "PendencyPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "PendencyStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('EXCEL', 'RECEIPT', 'API');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "LedgerOperation" AS ENUM ('DEBITO', 'CREDITO');

-- CreateEnum
CREATE TYPE "ChartPlanType" AS ENUM ('SINTETICA', 'ANALITICA');

-- CreateEnum
CREATE TYPE "RevenueExpense" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "DebitCredit" AS ENUM ('DEBITO', 'CREDITO');

-- CreateEnum
CREATE TYPE "FixedVariable" AS ENUM ('FIXO', 'VARIAVEL');

-- CreateEnum
CREATE TYPE "CostExpense" AS ENUM ('CUSTO', 'DESPESA');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'CONFIRM');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "categoryConfidence" INTEGER,
    "account" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "costCenter" TEXT,
    "attachmentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "externalCode" TEXT,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "useInCashFlow" BOOLEAN NOT NULL DEFAULT true,
    "superOnly" BOOLEAN NOT NULL DEFAULT false,
    "defaultConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "accountTypeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "externalCode" TEXT,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSuper" BOOLEAN NOT NULL DEFAULT false,
    "planType" "ChartPlanType" NOT NULL,
    "parentId" TEXT,
    "revenueExpense" "RevenueExpense" NOT NULL,
    "debitCredit" "DebitCredit" NOT NULL,
    "fixedVariable" "FixedVariable" NOT NULL,
    "costExpense" "CostExpense" NOT NULL,
    "accountingCode" TEXT,
    "dreHide" BOOLEAN NOT NULL DEFAULT false,
    "dreGroupOtherFinIncome" BOOLEAN NOT NULL DEFAULT false,
    "dreGroupDeductionsTaxes" BOOLEAN NOT NULL DEFAULT false,
    "dreGroupInvestments" BOOLEAN NOT NULL DEFAULT false,
    "dreGroupSalesMarketing" BOOLEAN NOT NULL DEFAULT false,
    "dreGroupProfitSharing" BOOLEAN NOT NULL DEFAULT false,
    "cashflowHide" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChartAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartAccountAllocation" (
    "id" TEXT NOT NULL,
    "chartAccountId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "annualTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChartAccountAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartAccountAllocationLine" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ChartAccountAllocationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankLedgerEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "accountId" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "checkNumber" TEXT,
    "entityCode" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "operation" "LedgerOperation" NOT NULL,
    "history" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "printOnClose" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "updatedById" TEXT,

    CONSTRAINT "BankLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankLedgerEntrySplit" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "chartAccountId" TEXT NOT NULL,
    "costCenterId" TEXT,
    "splitAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankLedgerEntrySplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "oldJson" TEXT,
    "newJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pendency" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "type" "PendencyType" NOT NULL,
    "question" TEXT NOT NULL,
    "priority" "PendencyPriority" NOT NULL,
    "status" "PendencyStatus" NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "response" TEXT,

    CONSTRAINT "Pendency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'QUEUED',
    "filename" TEXT,
    "mimeType" TEXT,
    "path" TEXT,
    "resultJson" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Transaction_companyId_date_idx" ON "Transaction"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AccountType_code_key" ON "AccountType"("code");

-- CreateIndex
CREATE INDEX "Account_companyId_idx" ON "Account"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_companyId_code_key" ON "Account"("companyId", "code");

-- CreateIndex
CREATE INDEX "CostCenter_companyId_idx" ON "CostCenter"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_companyId_code_key" ON "CostCenter"("companyId", "code");

-- CreateIndex
CREATE INDEX "ChartAccount_companyId_idx" ON "ChartAccount"("companyId");

-- CreateIndex
CREATE INDEX "ChartAccount_parentId_idx" ON "ChartAccount"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ChartAccountAllocation_chartAccountId_year_key" ON "ChartAccountAllocation"("chartAccountId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ChartAccountAllocationLine_allocationId_month_key" ON "ChartAccountAllocationLine"("allocationId", "month");

-- CreateIndex
CREATE INDEX "BankLedgerEntry_companyId_issueDate_idx" ON "BankLedgerEntry"("companyId", "issueDate");

-- CreateIndex
CREATE INDEX "BankLedgerEntry_accountId_idx" ON "BankLedgerEntry"("accountId");

-- CreateIndex
CREATE INDEX "BankLedgerEntrySplit_entryId_idx" ON "BankLedgerEntrySplit"("entryId");

-- CreateIndex
CREATE INDEX "BankLedgerEntrySplit_chartAccountId_idx" ON "BankLedgerEntrySplit"("chartAccountId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_entity_idx" ON "AuditLog"("companyId", "entity");

-- CreateIndex
CREATE INDEX "Pendency_companyId_status_idx" ON "Pendency"("companyId", "status");

-- CreateIndex
CREATE INDEX "Pendency_transactionId_idx" ON "Pendency"("transactionId");

-- CreateIndex
CREATE INDEX "ImportJob_companyId_status_idx" ON "ImportJob"("companyId", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_accountTypeId_fkey" FOREIGN KEY ("accountTypeId") REFERENCES "AccountType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartAccount" ADD CONSTRAINT "ChartAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartAccount" ADD CONSTRAINT "ChartAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChartAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartAccountAllocation" ADD CONSTRAINT "ChartAccountAllocation_chartAccountId_fkey" FOREIGN KEY ("chartAccountId") REFERENCES "ChartAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartAccountAllocationLine" ADD CONSTRAINT "ChartAccountAllocationLine_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "ChartAccountAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankLedgerEntry" ADD CONSTRAINT "BankLedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankLedgerEntry" ADD CONSTRAINT "BankLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankLedgerEntry" ADD CONSTRAINT "BankLedgerEntry_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankLedgerEntrySplit" ADD CONSTRAINT "BankLedgerEntrySplit_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "BankLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankLedgerEntrySplit" ADD CONSTRAINT "BankLedgerEntrySplit_chartAccountId_fkey" FOREIGN KEY ("chartAccountId") REFERENCES "ChartAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankLedgerEntrySplit" ADD CONSTRAINT "BankLedgerEntrySplit_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "BankLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendency" ADD CONSTRAINT "Pendency_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendency" ADD CONSTRAINT "Pendency_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
