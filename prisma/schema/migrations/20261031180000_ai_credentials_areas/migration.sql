-- AlterTable
ALTER TABLE "ai_settings" ADD COLUMN     "enabledAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ai_provider_credentials" (
    "provider" TEXT NOT NULL,
    "apiKeyEnc" TEXT,
    "model" TEXT,
    "baseUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_provider_credentials_pkey" PRIMARY KEY ("provider")
);

