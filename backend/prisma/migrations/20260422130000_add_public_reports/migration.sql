-- CreateTable
CREATE TABLE "PublicReport" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicReport_token_key" ON "PublicReport"("token");

-- CreateIndex
CREATE INDEX "PublicReport_token_idx" ON "PublicReport"("token");

-- CreateIndex
CREATE INDEX "PublicReport_companyId_idx" ON "PublicReport"("companyId");
