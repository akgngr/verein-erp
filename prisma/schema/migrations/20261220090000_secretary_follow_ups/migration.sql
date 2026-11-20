-- CreateEnum
CREATE TYPE "SecretaryFollowUpStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DONE', 'CANCELLED', 'EXHAUSTED');

-- CreateTable
CREATE TABLE "secretary_follow_ups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceHref" TEXT NOT NULL,
    "titleEnc" TEXT NOT NULL,
    "dueOn" TEXT NOT NULL,
    "status" "SecretaryFollowUpStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxReminders" INTEGER NOT NULL DEFAULT 3,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastRemindedOn" TEXT,
    "pausedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secretary_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "secretary_follow_ups_status_dueOn_idx" ON "secretary_follow_ups"("status", "dueOn");

-- CreateIndex
CREATE INDEX "secretary_follow_ups_userId_status_idx" ON "secretary_follow_ups"("userId", "status");

