-- B001 Q1 (#405): Kassenprüfer time-boxed audit room, guided checklist, and findings

-- CreateEnum
CREATE TYPE "AuditRoomSection" AS ENUM ('BOOKING_SAMPLE', 'RECEIPT_COMPLETENESS', 'CASH_COUNTS', 'BANK_RECONCILIATION', 'OPEN_ITEMS');

-- CreateEnum
CREATE TYPE "AuditFindingSeverity" AS ENUM ('INFO', 'NOTE', 'ISSUE');

-- CreateEnum
CREATE TYPE "AuditFindingStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "AccountingAuditRoom" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "auditorUserId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAuditRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAuditChecklistItem" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "section" "AuditRoomSection" NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "checkedById" TEXT,
    "checkedByLabel" TEXT,
    "checkedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAuditChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAuditFinding" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "section" "AuditRoomSection" NOT NULL,
    "severity" "AuditFindingSeverity" NOT NULL DEFAULT 'NOTE',
    "status" "AuditFindingStatus" NOT NULL DEFAULT 'OPEN',
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingAuditRoom_year_idx" ON "AccountingAuditRoom"("year");

-- CreateIndex
CREATE INDEX "AccountingAuditRoom_auditorUserId_expiresAt_idx" ON "AccountingAuditRoom"("auditorUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "AccountingAuditChecklistItem_roomId_idx" ON "AccountingAuditChecklistItem"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAuditChecklistItem_roomId_section_key" ON "AccountingAuditChecklistItem"("roomId", "section");

-- CreateIndex
CREATE INDEX "AccountingAuditFinding_roomId_status_idx" ON "AccountingAuditFinding"("roomId", "status");

-- AddForeignKey
ALTER TABLE "AccountingAuditChecklistItem" ADD CONSTRAINT "AccountingAuditChecklistItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "AccountingAuditRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingAuditFinding" ADD CONSTRAINT "AccountingAuditFinding_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "AccountingAuditRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
