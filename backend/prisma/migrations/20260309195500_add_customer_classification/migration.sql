-- CreateTable: CustomerClassification
CREATE TABLE IF NOT EXISTS "CustomerClassification" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "externalId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "notes" TEXT,
  "percentShare" DOUBLE PRECISION,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerClassification_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerClassification_companyId_externalId_key"
  ON "CustomerClassification"("companyId","externalId");

CREATE INDEX IF NOT EXISTS "CustomerClassification_companyId_idx"
  ON "CustomerClassification"("companyId");

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CustomerClassification_companyId_fkey'
  ) THEN
    ALTER TABLE "CustomerClassification"
      ADD CONSTRAINT "CustomerClassification_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
