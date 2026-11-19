-- CreateTable
CREATE TABLE "secretary_delegations" (
    "id" TEXT NOT NULL,
    "grantorId" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secretary_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "secretary_delegations_delegateId_revokedAt_expiresAt_idx" ON "secretary_delegations"("delegateId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "secretary_delegations_grantorId_revokedAt_idx" ON "secretary_delegations"("grantorId", "revokedAt");

