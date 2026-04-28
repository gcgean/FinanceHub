/*
  Warnings:

  - A unique constraint covering the columns `[entryId,chartAccountId]` on the table `BankLedgerEntrySplit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AccessGroup" DROP CONSTRAINT "AccessGroup_companyId_fkey";

-- AlterTable
ALTER TABLE "AccessGroup" ALTER COLUMN "permissions" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "aiBusinessFocus" TEXT,
ADD COLUMN     "aiDetailLevel" TEXT,
ADD COLUMN     "aiPersona" TEXT,
ADD COLUMN     "aiProvider" TEXT DEFAULT 'openai',
ADD COLUMN     "anthropicApiKey" TEXT,
ADD COLUMN     "geminiApiKey" TEXT,
ADD COLUMN     "openaiApiKey" TEXT;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "total" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "SalePayment" ALTER COLUMN "amount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BankLedgerEntrySplit_entryId_chartAccountId_key" ON "BankLedgerEntrySplit"("entryId", "chartAccountId");

-- AddForeignKey
ALTER TABLE "AccessGroup" ADD CONSTRAINT "AccessGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
