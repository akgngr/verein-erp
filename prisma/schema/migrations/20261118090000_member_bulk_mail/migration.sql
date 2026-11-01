-- CreateEnum
CREATE TYPE "MemberMailingStatus" AS ENUM ('SENDING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "bulkMailOptOut" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "members_mailings" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "statuses" TEXT[],
    "types" TEXT[],
    "status" "MemberMailingStatus" NOT NULL DEFAULT 'SENDING',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedNoEmail" INTEGER NOT NULL DEFAULT 0,
    "skippedOptOut" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "members_mailings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "members_mailings_createdAt_idx" ON "members_mailings"("createdAt");

