-- CreateEnum
CREATE TYPE "GrantStatus" AS ENUM ('PLANNED', 'APPLIED', 'APPROVED', 'ACTIVE', 'REPORTED', 'CLOSED', 'REJECTED');

-- CreateTable
CREATE TABLE "grants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "funder" TEXT NOT NULL,
    "fileNumber" TEXT,
    "purpose" TEXT,
    "status" "GrantStatus" NOT NULL DEFAULT 'PLANNED',
    "approvedCents" INTEGER,
    "ownShareCents" INTEGER NOT NULL DEFAULT 0,
    "thirdPartyCents" INTEGER NOT NULL DEFAULT 0,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "reportDueAt" DATE,
    "projectId" TEXT,
    "useNetAmounts" BOOLEAN NOT NULL DEFAULT false,
    "reportText" TEXT,
    "reportSubmittedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_budget_lines" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "plannedCents" INTEGER NOT NULL,
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "grant_budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_payouts" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "requestedAt" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "receivedAt" DATE,
    "note" TEXT,

    CONSTRAINT "grant_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grants_status_idx" ON "grants"("status");

-- CreateIndex
CREATE INDEX "grant_budget_lines_grantId_idx" ON "grant_budget_lines"("grantId");

-- CreateIndex
CREATE INDEX "grant_payouts_grantId_idx" ON "grant_payouts"("grantId");

-- AddForeignKey
ALTER TABLE "grant_budget_lines" ADD CONSTRAINT "grant_budget_lines_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_payouts" ADD CONSTRAINT "grant_payouts_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

