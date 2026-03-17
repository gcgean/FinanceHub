-- CreateTable
CREATE TABLE "AINotificationChannel" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "AIChannelType" NOT NULL,
    "target" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AINotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AINotificationLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "insightEventId" TEXT NOT NULL,
    "channelType" "AIChannelType" NOT NULL,
    "target" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerResponse" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "AINotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AINotificationChannel_companyId_userId_idx" ON "AINotificationChannel"("companyId", "userId");

-- CreateIndex
CREATE INDEX "AINotificationLog_companyId_insightEventId_idx" ON "AINotificationLog"("companyId", "insightEventId");

-- AddForeignKey
ALTER TABLE "AINotificationChannel" ADD CONSTRAINT "AINotificationChannel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AINotificationChannel" ADD CONSTRAINT "AINotificationChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AINotificationLog" ADD CONSTRAINT "AINotificationLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AINotificationLog" ADD CONSTRAINT "AINotificationLog_insightEventId_fkey" FOREIGN KEY ("insightEventId") REFERENCES "AIInsightEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
