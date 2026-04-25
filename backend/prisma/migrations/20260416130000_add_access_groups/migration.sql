-- CreateTable AccessGroup
CREATE TABLE "AccessGroup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccessGroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccessGroup_companyId_idx" ON "AccessGroup"("companyId");

ALTER TABLE "AccessGroup" ADD CONSTRAINT "AccessGroup_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable User: adicionar accessGroupId
ALTER TABLE "User" ADD COLUMN "accessGroupId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_accessGroupId_fkey"
  FOREIGN KEY ("accessGroupId") REFERENCES "AccessGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
