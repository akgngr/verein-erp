-- AlterTable
ALTER TABLE "ai_settings" DROP COLUMN "enabledAreas",
ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '{}';

