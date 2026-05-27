-- AlterTable: adiciona campo previousDay na Routine
ALTER TABLE "Routine" ADD COLUMN "previousDay" BOOLEAN NOT NULL DEFAULT false;
