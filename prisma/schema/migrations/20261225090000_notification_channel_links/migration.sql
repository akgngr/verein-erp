-- CreateTable
CREATE TABLE "notification_channel_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "addressEnc" TEXT,
    "addressHash" TEXT,
    "linkTokenHash" TEXT,
    "linkExpiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_channel_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_channel_links_linkTokenHash_key" ON "notification_channel_links"("linkTokenHash");

-- CreateIndex
CREATE INDEX "notification_channel_links_channel_addressHash_idx" ON "notification_channel_links"("channel", "addressHash");

-- CreateIndex
CREATE UNIQUE INDEX "notification_channel_links_userId_channel_key" ON "notification_channel_links"("userId", "channel");

