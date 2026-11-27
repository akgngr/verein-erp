-- CreateTable
CREATE TABLE "system_backups" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "storagePath" TEXT,
    "archiveSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "archiveSha256" TEXT,
    "manifestSha256" TEXT,
    "dbMode" TEXT,
    "dbTableCount" INTEGER NOT NULL DEFAULT 0,
    "dbRowCount" INTEGER NOT NULL DEFAULT 0,
    "uploadFileCount" INTEGER NOT NULL DEFAULT 0,
    "uploadTotalBytes" INTEGER NOT NULL DEFAULT 0,
    "appVersion" TEXT,
    "schemaVersion" TEXT,
    "migrationCount" INTEGER NOT NULL DEFAULT 0,
    "encryptionKeyVersion" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationStatus" TEXT,
    "verificationDetails" JSONB,
    "errorCode" TEXT,
    "createdById" TEXT,
    "createdByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_backups_createdAt_idx" ON "system_backups"("createdAt");

-- CreateIndex
CREATE INDEX "system_backups_status_createdAt_idx" ON "system_backups"("status", "createdAt");
