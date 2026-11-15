-- AlterTable
ALTER TABLE "ai_settings" ADD COLUMN     "cloudPseudonymousRecords" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cloudTextMode" TEXT NOT NULL DEFAULT 'INTENTS';

