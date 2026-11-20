-- CreateTable
CREATE TABLE "secretary_channel_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "addressEnc" TEXT,
    "codeHash" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "codeAttempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secretary_channel_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secretary_channel_deliveries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerId" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secretary_channel_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "secretary_channel_consents_userId_channel_key" ON "secretary_channel_consents"("userId", "channel");

-- CreateIndex
CREATE INDEX "secretary_channel_deliveries_userId_channel_day_idx" ON "secretary_channel_deliveries"("userId", "channel", "day");

-- CreateIndex
CREATE UNIQUE INDEX "secretary_channel_deliveries_userId_channel_day_kind_key" ON "secretary_channel_deliveries"("userId", "channel", "day", "kind");

