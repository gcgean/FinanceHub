-- CreateTable
CREATE TABLE "AccountType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "useInCashFlow" BOOLEAN NOT NULL DEFAULT true,
    "superOnly" BOOLEAN NOT NULL DEFAULT false,
    "defaultConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "accountTypeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Account_accountTypeId_fkey" FOREIGN KEY ("accountTypeId") REFERENCES "AccountType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostCenter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChartAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSuper" BOOLEAN NOT NULL DEFAULT false,
    "planType" TEXT NOT NULL,
    "parentId" TEXT,
    "revenueExpense" TEXT NOT NULL,
    "debitCredit" TEXT NOT NULL,
    "fixedVariable" TEXT NOT NULL,
    "costExpense" TEXT NOT NULL,
    "accountingCode" TEXT,
    "dreHide" BOOLEAN NOT NULL DEFAULT false,
    "dreGroupOtherFinIncome" BOOLEAN NOT NULL DEFAULT false,
    "dreGroupDeductionsTaxes" BOOLEAN NOT NULL DEFAULT false,
    "dreGroupInvestments" BOOLEAN NOT NULL DEFAULT false,
    "dreGroupSalesMarketing" BOOLEAN NOT NULL DEFAULT false,
    "dreGroupProfitSharing" BOOLEAN NOT NULL DEFAULT false,
    "cashflowHide" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChartAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChartAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChartAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChartAccountAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chartAccountId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "annualTotal" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChartAccountAllocation_chartAccountId_fkey" FOREIGN KEY ("chartAccountId") REFERENCES "ChartAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChartAccountAllocationLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allocationId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "ChartAccountAllocationLine_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "ChartAccountAllocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankLedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "paymentDate" DATETIME,
    "accountId" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "checkNumber" TEXT,
    "entityCode" TEXT,
    "amount" REAL NOT NULL,
    "operation" TEXT NOT NULL,
    "history" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "printOnClose" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "updatedById" TEXT,
    CONSTRAINT "BankLedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BankLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BankLedgerEntry_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankLedgerEntrySplit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "chartAccountId" TEXT NOT NULL,
    "costCenterId" TEXT,
    "splitAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankLedgerEntrySplit_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "BankLedgerEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BankLedgerEntrySplit_chartAccountId_fkey" FOREIGN KEY ("chartAccountId") REFERENCES "ChartAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BankLedgerEntrySplit_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT,
    "size" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "BankLedgerEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldJson" TEXT,
    "newJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
