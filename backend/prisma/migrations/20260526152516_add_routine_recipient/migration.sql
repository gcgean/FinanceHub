-- CreateEnum
CREATE TYPE "RecipientRole" AS ENUM ('SUPERVISOR', 'ATTENDANT');

-- DropForeignKey
ALTER TABLE "Routine" DROP CONSTRAINT "Routine_userId_fkey";

-- AlterTable
ALTER TABLE "Routine" ADD COLUMN     "recipientId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "RoutineRecipient" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "RecipientRole" NOT NULL DEFAULT 'SUPERVISOR',
    "telegramChatId" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "usuAtend" TEXT,
    "departamentos" TEXT[],
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutineRecipient_companyId_idx" ON "RoutineRecipient"("companyId");

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "RoutineRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineRecipient" ADD CONSTRAINT "RoutineRecipient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
