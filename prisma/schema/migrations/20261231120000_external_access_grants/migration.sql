-- CreateTable
CREATE TABLE "external_access_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleScope" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_access_grants_userId_expiresAt_idx" ON "external_access_grants"("userId", "expiresAt");
