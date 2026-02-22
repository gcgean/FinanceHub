-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "cityId" TEXT,
ADD COLUMN     "knownName" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "phone2" TEXT,
ADD COLUMN     "stateCode" TEXT,
ADD COLUMN     "value" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "cityId" TEXT,
ADD COLUMN     "phone2" TEXT,
ADD COLUMN     "stateCode" TEXT;

-- CreateTable
CREATE TABLE "State" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "State_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "City_stateCode_name_idx" ON "City"("stateCode", "name");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_stateCode_fkey" FOREIGN KEY ("stateCode") REFERENCES "State"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_stateCode_fkey" FOREIGN KEY ("stateCode") REFERENCES "State"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_stateCode_fkey" FOREIGN KEY ("stateCode") REFERENCES "State"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
