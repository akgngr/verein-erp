-- CreateTable
CREATE TABLE "user_totp" (
    "userId" TEXT NOT NULL,
    "secretEnc" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3),
    "lastUsedStep" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_totp_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "user_totp_recovery_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_totp_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_totp_recovery_codes_userId_idx" ON "user_totp_recovery_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_totp_recovery_codes_userId_codeHash_key" ON "user_totp_recovery_codes"("userId", "codeHash");

