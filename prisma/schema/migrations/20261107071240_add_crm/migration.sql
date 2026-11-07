-- CreateEnum
CREATE TYPE "CrmStage" AS ENUM ('LEAD', 'ACTIVE', 'CUSTOMER', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CrmDealStage" AS ENUM ('OPEN', 'PROPOSAL', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "CrmActivityKind" AS ENUM ('NOTE', 'CALL', 'MEETING', 'EMAIL', 'OTHER');

-- CreateTable
CREATE TABLE "crm_parties" (
    "id" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "stage" "CrmStage" NOT NULL DEFAULT 'LEAD',
    "ownerId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_deals" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountCents" INTEGER,
    "stage" "CrmDealStage" NOT NULL DEFAULT 'OPEN',
    "expectedCloseAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "dealId" TEXT,
    "kind" "CrmActivityKind" NOT NULL DEFAULT 'NOTE',
    "summary" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_follow_ups" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "dealId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "assigneeId" TEXT,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_parties_stage_idx" ON "crm_parties"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "crm_parties_sourceModule_sourceId_key" ON "crm_parties"("sourceModule", "sourceId");

-- CreateIndex
CREATE INDEX "crm_deals_stage_idx" ON "crm_deals"("stage");

-- CreateIndex
CREATE INDEX "crm_activities_partyId_occurredAt_idx" ON "crm_activities"("partyId", "occurredAt");

-- CreateIndex
CREATE INDEX "crm_follow_ups_dueAt_doneAt_idx" ON "crm_follow_ups"("dueAt", "doneAt");

-- AddForeignKey
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "crm_parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "crm_parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_follow_ups" ADD CONSTRAINT "crm_follow_ups_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "crm_parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

