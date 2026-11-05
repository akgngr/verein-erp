-- CreateTable
CREATE TABLE "automation_schedules" (
    "id" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "taskVersion" INTEGER NOT NULL,
    "organizationId" TEXT NOT NULL DEFAULT 'default',
    "intervalMinutes" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastExecutionId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_schedules_enabled_nextRunAt_idx" ON "automation_schedules"("enabled", "nextRunAt");
