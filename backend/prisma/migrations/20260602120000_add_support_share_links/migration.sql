-- CreateTable: links de acesso público ao relatório de atendimentos
CREATE TABLE "SupportShareLink" (
    "id"        TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name"      TEXT NOT NULL DEFAULT 'Acesso compartilhado',
    "active"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportShareLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportShareLink_token_key" ON "SupportShareLink"("token");
CREATE INDEX "SupportShareLink_token_idx" ON "SupportShareLink"("token");
CREATE INDEX "SupportShareLink_companyId_idx" ON "SupportShareLink"("companyId");

ALTER TABLE "SupportShareLink"
    ADD CONSTRAINT "SupportShareLink_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
