-- Feedback module: bug reports and suggestions from testers
-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'SUGGESTION');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateTable
CREATE TABLE "FeedbackItem" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pageUrl" TEXT,
    "userAgent" TEXT,
    "viewport" TEXT,
    "appVersion" TEXT,
    "screenshotPath" TEXT,
    "screenshotName" TEXT,
    "screenshotMime" TEXT,
    "reporterId" TEXT NOT NULL,
    "reporterLabel" TEXT NOT NULL,
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackItem_number_key" ON "FeedbackItem"("number");

-- CreateIndex
CREATE INDEX "FeedbackItem_status_createdAt_idx" ON "FeedbackItem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackItem_reporterId_idx" ON "FeedbackItem"("reporterId");

