ALTER TABLE "generated_files"
  ADD COLUMN "publicationPending" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "generationId" TEXT,
  ADD COLUMN "sha256" TEXT;

CREATE TABLE "file_generations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "sourceModule" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "generatorKey" TEXT NOT NULL,
  "generatorVersion" INTEGER NOT NULL,
  "format" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "idempotencyKey" TEXT NOT NULL,
  "executionId" TEXT,
  "fileId" TEXT,
  "leaseToken" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT,
  "deadlineAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "file_generations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "file_generations_executionId_key" ON "file_generations"("executionId");
CREATE UNIQUE INDEX "file_generation_request_key" ON "file_generations"("organizationId","ownerId","sourceModule","idempotencyKey");
CREATE INDEX "file_generations_ownerId_createdAt_idx" ON "file_generations"("ownerId","createdAt");
CREATE INDEX "file_generations_status_deadlineAt_idx" ON "file_generations"("status","deadlineAt");
CREATE INDEX "file_generations_expiresAt_idx" ON "file_generations"("expiresAt");
CREATE INDEX "generated_files_generationId_idx" ON "generated_files"("generationId");
CREATE INDEX "generated_files_publicationPending_createdAt_idx" ON "generated_files"("publicationPending","createdAt");

-- Preserve queued task payloads and existing completed file IDs on upgrade.
INSERT INTO "file_generations" (
  "id","organizationId","ownerId","sourceModule","purpose","generatorKey","generatorVersion",
  "format","status","idempotencyKey","executionId","fileId","deadlineAt","expiresAt","createdAt","updatedAt"
)
SELECT request."id",COALESCE(scope."deploymentId",execution."organizationId",'single-deployment'),request."userId",'ai','members.dues','ai.export_dataset',1,
  request."format",CASE WHEN request."status" IN ('QUEUED','READY','FAILED','CANCELLED') THEN request."status" ELSE 'FAILED' END,
  request."proposalId",request."executionId",request."fileId",request."expiresAt",request."createdAt" + INTERVAL '30 days',request."createdAt",request."createdAt"
FROM "ai_export_requests" request
LEFT JOIN "ai_datasets" dataset ON dataset."id" = request."datasetId"
LEFT JOIN "ai_reference_scopes" scope ON scope."id" = dataset."scopeId"
LEFT JOIN "automation_executions" execution ON execution."id" = request."executionId";

UPDATE "generated_files" file SET
  "generationId" = request."id",
  "publicationPending" = request."status" <> 'READY',
  "deletionPending" = file."deletionPending" OR request."status" <> 'READY'
FROM "ai_export_requests" request
WHERE file."ownerId" = request."userId" AND file."source" = 'members.dues'
  AND (file."id" = request."fileId" OR file."id" = request."id");
