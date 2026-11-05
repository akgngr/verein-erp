-- AlterEnum
ALTER TYPE "AutomationStepStatus" ADD VALUE IF NOT EXISTS 'WAITING';
ALTER TYPE "AutomationStepStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';

-- AlterTable
ALTER TABLE "automation_step_runs" ADD COLUMN "waitUntil" TIMESTAMP(3),
ADD COLUMN "childExecutionId" TEXT,
ADD COLUMN "decidedById" TEXT;

-- CreateIndex
CREATE INDEX "automation_step_runs_status_waitUntil_idx" ON "automation_step_runs"("status", "waitUntil");
CREATE INDEX "automation_step_runs_childExecutionId_idx" ON "automation_step_runs"("childExecutionId");

-- CreateTable
CREATE TABLE "automation_workflows" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "draft" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "activeVersionId" TEXT,
    "triggerEvent" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_workflow_versions" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "graph" JSONB NOT NULL,
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_workflows_enabled_triggerEvent_idx" ON "automation_workflows"("enabled", "triggerEvent");
CREATE UNIQUE INDEX "automation_workflow_versions_workflowId_version_key" ON "automation_workflow_versions"("workflowId", "version");

-- AddForeignKey
ALTER TABLE "automation_workflow_versions" ADD CONSTRAINT "automation_workflow_versions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "automation_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
