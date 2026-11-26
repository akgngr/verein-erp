-- CreateTable
CREATE TABLE "auth_oauth_link_intents" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "returnPath" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_oauth_link_intents_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "social_login_providers" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT NOT NULL,
    "secretEnc" TEXT NOT NULL,
    "tenantId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_login_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_oauth_link_intents_expiresAt_idx" ON "auth_oauth_link_intents"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "auth_oauth_link_intents_userId_key" ON "auth_oauth_link_intents"("userId");
