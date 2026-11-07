-- AlterTable
ALTER TABLE "online_form_requests" ADD COLUMN     "documentEnc" TEXT,
ADD COLUMN     "documentKey" TEXT,
ADD COLUMN     "evidenceEnc" TEXT,
ADD COLUMN     "textVersion" TEXT;

-- CreateTable
CREATE TABLE "online_form_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "privacyText" TEXT,
    "photoText" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_form_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "online_form_requests_documentKey_key" ON "online_form_requests"("documentKey");

