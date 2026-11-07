-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MailingStatus" ADD VALUE 'DRAFT';
ALTER TYPE "MailingStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "MailingStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "mailings_campaigns" ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "workflowId" TEXT;

-- CreateIndex
CREATE INDEX "mailings_campaigns_status_idx" ON "mailings_campaigns"("status");

