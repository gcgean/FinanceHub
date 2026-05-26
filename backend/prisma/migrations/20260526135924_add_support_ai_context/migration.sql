-- CreateTable
CREATE TABLE "SupportAIContext" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportAIContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportAIContext_companyId_key" ON "SupportAIContext"("companyId");

-- AddForeignKey
ALTER TABLE "SupportAIContext" ADD CONSTRAINT "SupportAIContext_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
