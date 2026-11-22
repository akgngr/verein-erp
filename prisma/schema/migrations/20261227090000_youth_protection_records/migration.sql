-- CreateEnum
CREATE TYPE "YouthProtectionStatus" AS ENUM ('CLEARED', 'EXCLUDED', 'PENDING');

-- CreateTable
CREATE TABLE "youth_protection_records" (
    "id" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "memberId" TEXT,
    "userId" TEXT,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "certificateIssueDate" TIMESTAMP(3) NOT NULL,
    "inspectingOfficer" TEXT NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "status" "YouthProtectionStatus" NOT NULL DEFAULT 'CLEARED',
    "activityEndedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youth_protection_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "youth_protection_records_nextDueDate_idx" ON "youth_protection_records"("nextDueDate");

-- CreateIndex
CREATE INDEX "youth_protection_records_personName_idx" ON "youth_protection_records"("personName");

-- CreateIndex
CREATE INDEX "youth_protection_records_memberId_idx" ON "youth_protection_records"("memberId");

-- CreateIndex
CREATE INDEX "youth_protection_records_userId_idx" ON "youth_protection_records"("userId");

-- CreateIndex
CREATE INDEX "youth_protection_records_activityEndedAt_idx" ON "youth_protection_records"("activityEndedAt");
