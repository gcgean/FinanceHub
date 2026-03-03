-- AlterEnum
BEGIN;
CREATE TYPE "CompanyPlan_new" AS ENUM ('BASIC', 'PROFESSIONAL', 'ENTERPRISE');
ALTER TABLE "Company" ALTER COLUMN "plan" TYPE "CompanyPlan_new" USING ("plan"::text::"CompanyPlan_new");
ALTER TYPE "CompanyPlan" RENAME TO "CompanyPlan_old";
ALTER TYPE "CompanyPlan_new" RENAME TO "CompanyPlan";
DROP TYPE "CompanyPlan_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CompanyStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');
ALTER TABLE "Company" ALTER COLUMN "status" TYPE "CompanyStatus_new" USING ("status"::text::"CompanyStatus_new");
ALTER TYPE "CompanyStatus" RENAME TO "CompanyStatus_old";
ALTER TYPE "CompanyStatus_new" RENAME TO "CompanyStatus";
DROP TYPE "CompanyStatus_old";
COMMIT;

-- DropIndex
DROP INDEX "Customer_document_key";

-- DropIndex
DROP INDEX "Supplier_document_key";

-- AlterTable
ALTER TABLE "ApTitle" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "ArTitle" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "ChartAccount" ALTER COLUMN "costExpense" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "city",
DROP COLUMN "isActive",
DROP COLUMN "state",
DROP COLUMN "plan",
ADD COLUMN     "plan" "CompanyPlan" NOT NULL DEFAULT 'PROFESSIONAL',
DROP COLUMN "status",
ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categoryPath",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "group" TEXT,
ADD COLUMN     "section" TEXT,
ADD COLUMN     "subgroup" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "value" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "erp" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncStatus" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncErrorMessage" TEXT,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDeactivationReason" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "externalId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerDeactivationReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDeactivation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "reason" TEXT,
    "reasonId" TEXT,
    "deactivatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerDeactivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT,
    "paymentMethodId" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "externalId" TEXT,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_companyId_erp_key" ON "Integration"("companyId", "erp");

-- CreateIndex
CREATE INDEX "CustomerDeactivationReason_companyId_idx" ON "CustomerDeactivationReason"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerDeactivationReason_companyId_externalId_key" ON "CustomerDeactivationReason"("companyId", "externalId");

-- CreateIndex
CREATE INDEX "CustomerDeactivation_companyId_customerId_idx" ON "CustomerDeactivation"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "Sale_companyId_idx" ON "Sale"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_companyId_externalId_key" ON "Sale"("companyId", "externalId");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "PaymentMethod_companyId_idx" ON "PaymentMethod"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_companyId_externalId_key" ON "PaymentMethod"("companyId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_companyId_externalCode_key" ON "Account"("companyId", "externalCode");

-- CreateIndex
CREATE UNIQUE INDEX "ApTitle_companyId_externalId_key" ON "ApTitle"("companyId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ArTitle_companyId_externalId_key" ON "ArTitle"("companyId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ChartAccount_companyId_code_key" ON "ChartAccount"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_companyId_externalCode_key" ON "CostCenter"("companyId", "externalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_companyId_externalId_key" ON "Customer"("companyId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_companyId_document_key" ON "Customer"("companyId", "document");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_code_key" ON "Product"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_externalId_key" ON "Product"("companyId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_companyId_externalId_key" ON "Supplier"("companyId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_companyId_document_key" ON "Supplier"("companyId", "document");

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDeactivationReason" ADD CONSTRAINT "CustomerDeactivationReason_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDeactivation" ADD CONSTRAINT "CustomerDeactivation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDeactivation" ADD CONSTRAINT "CustomerDeactivation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDeactivation" ADD CONSTRAINT "CustomerDeactivation_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "CustomerDeactivationReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
