-- Automation execution state belongs to the ERP; pg-boss remains transport-only.

CREATE TYPE "AutomationExecutionKind" AS ENUM ('TASK', 'WORKFLOW');
CREATE TYPE "AutomationExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "AutomationStepStatus" AS ENUM ('PENDING', 'RUNNING', 'RETRYING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "AutomationOutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

CREATE TABLE "automation_executions" (
    "id" TEXT NOT NULL,
    "kind" "AutomationExecutionKind" NOT NULL DEFAULT 'TASK',
    "status" "AutomationExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "definitionKey" TEXT NOT NULL,
    "definitionVersion" INTEGER NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedById" TEXT,
    "sourceModule" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "input" JSONB NOT NULL DEFAULT '{}',
    "context" JSONB NOT NULL DEFAULT '{}',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "automation_step_runs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "taskVersion" INTEGER NOT NULL,
    "status" "AutomationStepStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "automation_step_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "automation_step_runs_executionId_fkey"
      FOREIGN KEY ("executionId") REFERENCES "automation_executions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "automation_outbox" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "executionId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "AutomationOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "automation_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "automation_executions_organizationId_idempotencyKey_key"
  ON "automation_executions"("organizationId", "idempotencyKey");
CREATE INDEX "automation_executions_status_scheduledAt_idx"
  ON "automation_executions"("status", "scheduledAt");
CREATE INDEX "automation_executions_sourceModule_createdAt_idx"
  ON "automation_executions"("sourceModule", "createdAt");
CREATE INDEX "automation_executions_correlationId_idx"
  ON "automation_executions"("correlationId");
CREATE UNIQUE INDEX "automation_step_runs_executionId_stepKey_key"
  ON "automation_step_runs"("executionId", "stepKey");
CREATE INDEX "automation_step_runs_status_createdAt_idx"
  ON "automation_step_runs"("status", "createdAt");
CREATE UNIQUE INDEX "automation_outbox_eventKey_key"
  ON "automation_outbox"("eventKey");
CREATE INDEX "automation_outbox_status_availableAt_createdAt_idx"
  ON "automation_outbox"("status", "availableAt", "createdAt");
CREATE INDEX "automation_outbox_executionId_idx"
  ON "automation_outbox"("executionId");
