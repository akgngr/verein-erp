-- Durable operational events for background task monitoring.
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "event" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "automation_logs_executionId_fkey"
      FOREIGN KEY ("executionId") REFERENCES "automation_executions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "automation_logs_executionId_createdAt_idx"
  ON "automation_logs"("executionId", "createdAt");
CREATE INDEX "automation_logs_level_createdAt_idx"
  ON "automation_logs"("level", "createdAt");
