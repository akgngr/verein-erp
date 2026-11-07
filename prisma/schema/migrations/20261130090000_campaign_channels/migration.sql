-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "messagingConsents" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "campaign_telegram_links" (
    "id" TEXT NOT NULL,
    "recipientKey" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "chatId" TEXT,
    "linkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_telegram_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailings_channel_configs" (
    "channel" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "secretsEnc" TEXT,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailings_channel_configs_pkey" PRIMARY KEY ("channel")
);

-- CreateTable
CREATE TABLE "mailings_deliveries" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mailings_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_telegram_links_recipientKey_key" ON "campaign_telegram_links"("recipientKey");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_telegram_links_token_key" ON "campaign_telegram_links"("token");

-- CreateIndex
CREATE INDEX "mailings_deliveries_createdAt_idx" ON "mailings_deliveries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mailings_deliveries_campaignId_address_key" ON "mailings_deliveries"("campaignId", "address");

