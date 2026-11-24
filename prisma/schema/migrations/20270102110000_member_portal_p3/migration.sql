-- CreateTable
CREATE TABLE "portal_art15_requests" (
    "id" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "generatedFileId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_art15_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portal_art15_requests_subjectRef_status_idx" ON "portal_art15_requests"("subjectRef", "status");

-- CreateIndex
CREATE INDEX "portal_art15_requests_memberId_createdAt_idx" ON "portal_art15_requests"("memberId", "createdAt");
