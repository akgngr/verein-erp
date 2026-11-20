-- CreateTable
CREATE TABLE "notification_push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpointHash" TEXT NOT NULL,
    "endpointEnc" TEXT NOT NULL,
    "keysEnc" TEXT NOT NULL,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_push_subscriptions_endpointHash_key" ON "notification_push_subscriptions"("endpointHash");

-- CreateIndex
CREATE INDEX "notification_push_subscriptions_userId_idx" ON "notification_push_subscriptions"("userId");

