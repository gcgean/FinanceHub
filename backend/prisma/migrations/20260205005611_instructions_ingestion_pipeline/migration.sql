-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('ERP_API', 'EXCEL', 'MANUAL');

-- CreateEnum
CREATE TYPE "DataSourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR');

-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('NONE', 'API_KEY', 'OAUTH2', 'BASIC', 'JWT');

-- CreateEnum
CREATE TYPE "RawEventStatus" AS ENUM ('RECEIVED', 'PARSED', 'REJECTED');

-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN     "dataSourceId" TEXT,
ADD COLUMN     "entity" TEXT,
ADD COLUMN     "errorSummary" TEXT,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "origin" TEXT,
ADD COLUMN     "requestedByUserId" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "statsJson" TEXT;

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "DataSourceType" NOT NULL,
    "providerKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DataSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "baseUrl" TEXT,
    "authType" "AuthType" NOT NULL DEFAULT 'NONE',
    "authData" TEXT,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportFile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dataSourceId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "externalId" TEXT,
    "payload" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RawEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,

    CONSTRAINT "RawEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportError" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rawEventId" TEXT,
    "entity" TEXT NOT NULL,
    "externalId" TEXT,
    "errorCode" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "detailsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalRef" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dataSourceId" TEXT,
    "entity" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "targetTable" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StgCustomer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rawEventId" TEXT NOT NULL,
    "externalCustomerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAtSource" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StgCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StgSupplier" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rawEventId" TEXT NOT NULL,
    "externalSupplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAtSource" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StgSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StgProduct" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rawEventId" TEXT NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "categoryPath" TEXT,
    "brandName" TEXT,
    "costPrice" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAtSource" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StgProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StgInventory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rawEventId" TEXT NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "externalLocationId" TEXT,
    "locationName" TEXT,
    "qtyOnHand" DOUBLE PRECISION NOT NULL,
    "updatedAtSource" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StgInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StgSalesInvoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rawEventId" TEXT NOT NULL,
    "externalInvoiceId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "externalCustomerId" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION,
    "freightAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "updatedAtSource" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StgSalesInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StgSalesInvoiceItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stgSalesInvoiceId" TEXT NOT NULL,
    "externalProductId" TEXT,
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "costEstimate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StgSalesInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StgPurchaseInvoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rawEventId" TEXT NOT NULL,
    "externalInvoiceId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "externalSupplierId" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION,
    "freightAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "updatedAtSource" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StgPurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StgPurchaseInvoiceItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stgPurchaseInvoiceId" TEXT NOT NULL,
    "externalProductId" TEXT,
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "costEstimate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StgPurchaseInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataSource_companyId_status_idx" ON "DataSource"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_companyId_providerKey_name_key" ON "DataSource"("companyId", "providerKey", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ImportFile_companyId_checksumSha256_key" ON "ImportFile"("companyId", "checksumSha256");

-- CreateIndex
CREATE INDEX "RawEvent_companyId_dataSourceId_entity_receivedAt_idx" ON "RawEvent"("companyId", "dataSourceId", "entity", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RawEvent_companyId_dataSourceId_entity_payloadHash_key" ON "RawEvent"("companyId", "dataSourceId", "entity", "payloadHash");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalRef_companyId_entity_externalId_key" ON "ExternalRef"("companyId", "entity", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "StgCustomer_companyId_dataSourceId_externalCustomerId_key" ON "StgCustomer"("companyId", "dataSourceId", "externalCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "StgSupplier_companyId_dataSourceId_externalSupplierId_key" ON "StgSupplier"("companyId", "dataSourceId", "externalSupplierId");

-- CreateIndex
CREATE UNIQUE INDEX "StgProduct_companyId_dataSourceId_externalProductId_key" ON "StgProduct"("companyId", "dataSourceId", "externalProductId");

-- CreateIndex
CREATE INDEX "StgInventory_companyId_externalProductId_idx" ON "StgInventory"("companyId", "externalProductId");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportFile" ADD CONSTRAINT "ImportFile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportFile" ADD CONSTRAINT "ImportFile_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportFile" ADD CONSTRAINT "ImportFile_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawEvent" ADD CONSTRAINT "RawEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawEvent" ADD CONSTRAINT "RawEvent_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawEvent" ADD CONSTRAINT "RawEvent_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportError" ADD CONSTRAINT "ImportError_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportError" ADD CONSTRAINT "ImportError_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportError" ADD CONSTRAINT "ImportError_rawEventId_fkey" FOREIGN KEY ("rawEventId") REFERENCES "RawEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalRef" ADD CONSTRAINT "ExternalRef_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalRef" ADD CONSTRAINT "ExternalRef_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StgCustomer" ADD CONSTRAINT "StgCustomer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StgSupplier" ADD CONSTRAINT "StgSupplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StgProduct" ADD CONSTRAINT "StgProduct_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StgInventory" ADD CONSTRAINT "StgInventory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StgSalesInvoice" ADD CONSTRAINT "StgSalesInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StgSalesInvoiceItem" ADD CONSTRAINT "StgSalesInvoiceItem_stgSalesInvoiceId_fkey" FOREIGN KEY ("stgSalesInvoiceId") REFERENCES "StgSalesInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StgPurchaseInvoice" ADD CONSTRAINT "StgPurchaseInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StgPurchaseInvoiceItem" ADD CONSTRAINT "StgPurchaseInvoiceItem_stgPurchaseInvoiceId_fkey" FOREIGN KEY ("stgPurchaseInvoiceId") REFERENCES "StgPurchaseInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
