-- CreateTable
CREATE TABLE "InventoryLocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "hashTable" TEXT,
    "updatedAtSource" TIMESTAMP(3),
    "ignoreConsolidation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StgInventory" ADD COLUMN     "deactivated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ead" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLocation_companyId_externalId_key" ON "InventoryLocation"("companyId", "externalId");

-- CreateIndex
CREATE INDEX "InventoryLocation_companyId_idx" ON "InventoryLocation"("companyId");

-- AddForeignKey
ALTER TABLE "InventoryLocation" ADD CONSTRAINT "InventoryLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
