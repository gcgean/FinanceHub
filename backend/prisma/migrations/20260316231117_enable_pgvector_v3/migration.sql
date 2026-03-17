-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "AIDocument" ADD COLUMN     "embedding" vector(1536);

-- AlterTable
ALTER TABLE "AIMemory" ADD COLUMN     "embedding" vector(1536);
