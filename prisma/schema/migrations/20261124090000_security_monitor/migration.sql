-- Create tables for the Security Monitor module.
CREATE TABLE "SecurityTestRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "testSuite" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "passed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "environment" TEXT NOT NULL,
    "nodeVersion" TEXT NOT NULL,
    "osPlatform" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "logs" JSONB NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "commitHash" TEXT,
    "branch" TEXT,
    CONSTRAINT "SecurityTestRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityTestAlert" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "severity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "description" TEXT,
    "testRunId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    CONSTRAINT "SecurityTestAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityTestSchedule" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "testSuite" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastRunId" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "timeoutMs" INTEGER NOT NULL DEFAULT 300000,
    "retryCount" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "SecurityTestSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityTestRun_testSuite_createdAt_idx" ON "SecurityTestRun"("testSuite", "createdAt");
CREATE INDEX "SecurityTestRun_status_createdAt_idx" ON "SecurityTestRun"("status", "createdAt");
CREATE INDEX "SecurityTestRun_environment_createdAt_idx" ON "SecurityTestRun"("environment", "createdAt");
CREATE INDEX "SecurityTestAlert_severity_status_createdAt_idx" ON "SecurityTestAlert"("severity", "status", "createdAt");
CREATE INDEX "SecurityTestAlert_testRunId_idx" ON "SecurityTestAlert"("testRunId");
CREATE INDEX "SecurityTestSchedule_name_idx" ON "SecurityTestSchedule"("name");
CREATE INDEX "SecurityTestSchedule_enabled_nextRunAt_idx" ON "SecurityTestSchedule"("enabled", "nextRunAt");

ALTER TABLE "SecurityTestAlert"
ADD CONSTRAINT "SecurityTestAlert_testRunId_fkey"
FOREIGN KEY ("testRunId") REFERENCES "SecurityTestRun"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
