-- CreateTable
CREATE TABLE "portal_login_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'login',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_login_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_sessions" (
    "id" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "stepUpUntil" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_passkeys" (
    "id" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "security_rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "portal_login_tokens_tokenHash_key" ON "portal_login_tokens"("tokenHash");
CREATE INDEX "portal_login_tokens_subjectRef_expiresAt_idx" ON "portal_login_tokens"("subjectRef", "expiresAt");
CREATE UNIQUE INDEX "portal_sessions_sessionHash_key" ON "portal_sessions"("sessionHash");
CREATE INDEX "portal_sessions_subjectRef_expiresAt_idx" ON "portal_sessions"("subjectRef", "expiresAt");
CREATE UNIQUE INDEX "portal_passkeys_credentialId_key" ON "portal_passkeys"("credentialId");
CREATE INDEX "portal_passkeys_subjectRef_idx" ON "portal_passkeys"("subjectRef");
