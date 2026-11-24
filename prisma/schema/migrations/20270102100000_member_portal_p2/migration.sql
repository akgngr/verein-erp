-- CreateTable
CREATE TABLE "member_correction_proposals" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TEXT,
    "proposedValue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedByRef" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedByLabel" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_correction_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_consent_challenges" (
    "id" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "addressMasked" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_consent_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_correction_proposals_memberId_status_idx" ON "member_correction_proposals"("memberId", "status");

-- CreateIndex
CREATE INDEX "member_correction_proposals_status_createdAt_idx" ON "member_correction_proposals"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "portal_consent_challenges_tokenHash_key" ON "portal_consent_challenges"("tokenHash");

-- CreateIndex
CREATE INDEX "portal_consent_challenges_subjectRef_channel_idx" ON "portal_consent_challenges"("subjectRef", "channel");

-- AddForeignKey
ALTER TABLE "member_correction_proposals" ADD CONSTRAINT "member_correction_proposals_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
