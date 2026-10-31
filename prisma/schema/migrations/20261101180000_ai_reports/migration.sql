-- CreateTable
CREATE TABLE "ai_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titleEnc" TEXT NOT NULL,
    "contentEnc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_reports_userId_createdAt_idx" ON "ai_reports"("userId", "createdAt");

