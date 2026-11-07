-- AlterTable
ALTER TABLE "students_guardians" ADD COLUMN     "bulkMailOptOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messagingConsents" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "mailings_campaigns" ADD COLUMN     "design" JSONB;

