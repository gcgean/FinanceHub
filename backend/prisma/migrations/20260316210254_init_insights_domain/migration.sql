-- CreateEnum
CREATE TYPE "AIInsightSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AIInsightStatus" AS ENUM ('NEW', 'SENT', 'READ', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AIInsightSourceType" AS ENUM ('RULE_ENGINE', 'LLM_ANALYSIS', 'MANUAL');

-- CreateEnum
CREATE TYPE "AIChannelType" AS ENUM ('EMAIL', 'WHATSAPP', 'TELEGRAM', 'IN_APP');

-- CreateEnum
CREATE TYPE "AIInsightDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "AIInsightFeedbackType" AS ENUM ('USEFUL', 'IRRELEVANT', 'FALSE_POSITIVE', 'TOO_FREQUENT', 'OTHER');

-- AlterTable
ALTER TABLE "AIProfile" ADD COLUMN     "segment" TEXT;

-- CreateTable
CREATE TABLE "AIInsightRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "sectorId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "insightType" TEXT NOT NULL,
    "severityDefault" "AIInsightSeverity" NOT NULL DEFAULT 'MEDIUM',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "conditionsJson" TEXT NOT NULL,
    "actionTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIInsightRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsightEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ruleId" TEXT,
    "sectorId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detailedContext" TEXT,
    "severity" "AIInsightSeverity" NOT NULL,
    "status" "AIInsightStatus" NOT NULL DEFAULT 'NEW',
    "sourceType" "AIInsightSourceType" NOT NULL DEFAULT 'RULE_ENGINE',
    "metricReference" TEXT,
    "payloadJson" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIInsightEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsightRecipient" (
    "id" TEXT NOT NULL,
    "insightEventId" TEXT NOT NULL,
    "userId" TEXT,
    "externalChannelTarget" TEXT,
    "channelType" "AIChannelType" NOT NULL DEFAULT 'IN_APP',
    "deliveryStatus" "AIInsightDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInsightRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsightFeedback" (
    "id" TEXT NOT NULL,
    "insightEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedbackType" "AIInsightFeedbackType" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInsightFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIInsightRule_code_key" ON "AIInsightRule"("code");

-- CreateIndex
CREATE INDEX "AIInsightRule_companyId_idx" ON "AIInsightRule"("companyId");

-- CreateIndex
CREATE INDEX "AIInsightRule_sectorId_idx" ON "AIInsightRule"("sectorId");

-- CreateIndex
CREATE INDEX "AIInsightEvent_companyId_status_idx" ON "AIInsightEvent"("companyId", "status");

-- CreateIndex
CREATE INDEX "AIInsightEvent_ruleId_idx" ON "AIInsightEvent"("ruleId");

-- CreateIndex
CREATE INDEX "AIInsightRecipient_insightEventId_idx" ON "AIInsightRecipient"("insightEventId");

-- CreateIndex
CREATE INDEX "AIInsightRecipient_userId_idx" ON "AIInsightRecipient"("userId");

-- CreateIndex
CREATE INDEX "AIInsightFeedback_insightEventId_idx" ON "AIInsightFeedback"("insightEventId");

-- AddForeignKey
ALTER TABLE "AIInsightRule" ADD CONSTRAINT "AIInsightRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsightRule" ADD CONSTRAINT "AIInsightRule_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "AISector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsightEvent" ADD CONSTRAINT "AIInsightEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsightEvent" ADD CONSTRAINT "AIInsightEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AIInsightRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsightEvent" ADD CONSTRAINT "AIInsightEvent_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "AISector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsightRecipient" ADD CONSTRAINT "AIInsightRecipient_insightEventId_fkey" FOREIGN KEY ("insightEventId") REFERENCES "AIInsightEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsightRecipient" ADD CONSTRAINT "AIInsightRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsightFeedback" ADD CONSTRAINT "AIInsightFeedback_insightEventId_fkey" FOREIGN KEY ("insightEventId") REFERENCES "AIInsightEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsightFeedback" ADD CONSTRAINT "AIInsightFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
