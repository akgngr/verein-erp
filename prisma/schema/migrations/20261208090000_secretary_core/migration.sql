-- CreateEnum
CREATE TYPE "SecretaryItemStateKind" AS ENUM ('DISMISSED', 'SNOOZED');

-- CreateEnum
CREATE TYPE "SecretaryProposalStatus" AS ENUM ('PENDING', 'EXECUTING', 'APPLIED', 'FAILED', 'DISMISSED', 'EXPIRED');

-- CreateTable
CREATE TABLE "secretary_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "briefingTime" TEXT NOT NULL DEFAULT '07:30',
    "briefingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietFrom" TEXT,
    "quietTo" TEXT,
    "channels" TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secretary_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secretary_item_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "state" "SecretaryItemStateKind" NOT NULL,
    "until" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secretary_item_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secretary_proposals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'rule',
    "itemId" TEXT,
    "moduleKey" TEXT NOT NULL,
    "actionKey" TEXT NOT NULL,
    "payloadEnc" TEXT NOT NULL,
    "previewEnc" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "preconditionsEnc" TEXT,
    "status" "SecretaryProposalStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secretary_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "secretary_preferences_userId_key" ON "secretary_preferences"("userId");

-- CreateIndex
CREATE INDEX "secretary_item_states_userId_until_idx" ON "secretary_item_states"("userId", "until");

-- CreateIndex
CREATE UNIQUE INDEX "secretary_item_states_userId_itemId_key" ON "secretary_item_states"("userId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "secretary_proposals_idempotencyKey_key" ON "secretary_proposals"("idempotencyKey");

-- CreateIndex
CREATE INDEX "secretary_proposals_userId_status_expiresAt_idx" ON "secretary_proposals"("userId", "status", "expiresAt");
