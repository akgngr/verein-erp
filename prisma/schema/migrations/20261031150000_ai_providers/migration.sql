-- AlterTable
ALTER TABLE "ai_user_consents" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

