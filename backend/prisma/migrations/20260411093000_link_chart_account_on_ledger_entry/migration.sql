ALTER TABLE "BankLedgerEntry"
ADD COLUMN IF NOT EXISTS "chartAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "costCenterId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BankLedgerEntry_chartAccountId_fkey'
  ) THEN
    ALTER TABLE "BankLedgerEntry"
    ADD CONSTRAINT "BankLedgerEntry_chartAccountId_fkey"
    FOREIGN KEY ("chartAccountId") REFERENCES "ChartAccount"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BankLedgerEntry_costCenterId_fkey'
  ) THEN
    ALTER TABLE "BankLedgerEntry"
    ADD CONSTRAINT "BankLedgerEntry_costCenterId_fkey"
    FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "BankLedgerEntry_chartAccountId_idx" ON "BankLedgerEntry"("chartAccountId");
CREATE INDEX IF NOT EXISTS "BankLedgerEntry_costCenterId_idx" ON "BankLedgerEntry"("costCenterId");

UPDATE "BankLedgerEntry" e
SET
  "chartAccountId" = s."chartAccountId",
  "costCenterId" = COALESCE(s."costCenterId", e."costCenterId")
FROM (
  SELECT DISTINCT ON ("entryId") "entryId", "chartAccountId", "costCenterId"
  FROM "BankLedgerEntrySplit"
  ORDER BY "entryId", "createdAt" ASC
) s
WHERE e."id" = s."entryId"
  AND (e."chartAccountId" IS NULL OR e."costCenterId" IS NULL);
