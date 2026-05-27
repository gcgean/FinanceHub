-- AlterTable: adiciona campo departamentos na Routine (array de erpCodes)
ALTER TABLE "Routine" ADD COLUMN "departamentos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
