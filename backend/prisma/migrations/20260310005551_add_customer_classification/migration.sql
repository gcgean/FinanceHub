-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "classificationId" TEXT;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Customer_classificationId_fkey') THEN
        ALTER TABLE "Customer" ADD CONSTRAINT "Customer_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "CustomerClassification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
