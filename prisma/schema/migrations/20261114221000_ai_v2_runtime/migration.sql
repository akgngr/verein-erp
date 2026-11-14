-- AlterTable
ALTER TABLE "ai_user_consents" ADD COLUMN     "policyRevision" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ai_conversations" ADD COLUMN     "activeTurnId" TEXT,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "turnLeaseExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "generated_files" ADD COLUMN     "deletionPending" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ai_reference_scopes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "deploymentId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "policyRevision" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ai_reference_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_entity_references" (
    "id" TEXT NOT NULL,
    "tokenDigest" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_entity_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_datasets" (
    "id" TEXT NOT NULL,
    "tokenDigest" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "queryVersion" INTEGER NOT NULL,
    "definitionEnc" TEXT NOT NULL,
    "selectionEnc" TEXT NOT NULL,
    "selectionHash" TEXT NOT NULL,
    "allowedColumns" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_proposals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "providerRevision" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "actionKey" TEXT NOT NULL,
    "payloadEnc" TEXT NOT NULL,
    "previewEnc" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "preconditionsEnc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "executionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ai_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_turn_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
    "resultEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_turn_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_buckets" (
    "scopeKey" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "tokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_usage_buckets_pkey" PRIMARY KEY ("scopeKey","windowStart")
);

-- CreateTable
CREATE TABLE "ai_export_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "providerRevision" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "proposalId" TEXT NOT NULL,
    "executionId" TEXT,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_export_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_reference_scopes_userId_expiresAt_idx" ON "ai_reference_scopes"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_entity_references_tokenDigest_key" ON "ai_entity_references"("tokenDigest");

-- CreateIndex
CREATE INDEX "ai_entity_references_scopeId_resource_recordId_idx" ON "ai_entity_references"("scopeId", "resource", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_datasets_tokenDigest_key" ON "ai_datasets"("tokenDigest");

-- CreateIndex
CREATE INDEX "ai_datasets_scopeId_expiresAt_idx" ON "ai_datasets"("scopeId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_proposals_idempotencyKey_key" ON "ai_proposals"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ai_proposals_userId_expiresAt_idx" ON "ai_proposals"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "ai_turn_claims_conversationId_status_idx" ON "ai_turn_claims"("conversationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_turn_claims_userId_conversationId_requestKey_key" ON "ai_turn_claims"("userId", "conversationId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "ai_export_requests_proposalId_key" ON "ai_export_requests"("proposalId");

-- CreateIndex
CREATE INDEX "ai_export_requests_userId_createdAt_idx" ON "ai_export_requests"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_entity_references" ADD CONSTRAINT "ai_entity_references_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "ai_reference_scopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_datasets" ADD CONSTRAINT "ai_datasets_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "ai_reference_scopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

