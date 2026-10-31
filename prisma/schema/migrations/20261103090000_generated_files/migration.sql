-- CreateTable
CREATE TABLE "generated_files" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "titleEnc" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_files_ownerId_createdAt_idx" ON "generated_files"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "generated_files_expiresAt_idx" ON "generated_files"("expiresAt");
