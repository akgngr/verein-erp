-- CreateEnum
CREATE TYPE "MailingStatus" AS ENUM ('SENDING', 'DONE', 'FAILED');



-- CreateTable
CREATE TABLE "mailings_campaigns" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "filter" JSONB NOT NULL DEFAULT '{}',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "MailingStatus" NOT NULL DEFAULT 'SENDING',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedNoEmail" INTEGER NOT NULL DEFAULT 0,
    "skippedOptOut" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "mailings_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mailings_campaigns_createdAt_idx" ON "mailings_campaigns"("createdAt");

-- Toplu e-posta geçmişi üyeler modülünden yeni modüle taşınır (veri kaybı yok).
INSERT INTO "mailings_campaigns" ("id", "source", "filter", "subject", "body", "status", "recipientCount", "sentCount", "failedCount", "skippedNoEmail", "skippedOptOut", "createdById", "createdByLabel", "createdAt", "finishedAt")
SELECT "id", 'members:members', jsonb_build_object('status', to_jsonb("statuses"), 'type', to_jsonb("types")), "subject", "body", "status"::text::"MailingStatus", "recipientCount", "sentCount", "failedCount", "skippedNoEmail", "skippedOptOut", "createdById", "createdByLabel", "createdAt", "finishedAt"
FROM "members_mailings";

-- DropTable
DROP TABLE "members_mailings";

-- DropEnum
DROP TYPE "MemberMailingStatus";
