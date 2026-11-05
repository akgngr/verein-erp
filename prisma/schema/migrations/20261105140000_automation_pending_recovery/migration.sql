-- Efficiently locate stale PENDING executions during queue-delivery recovery.
CREATE INDEX "automation_executions_status_updatedAt_idx"
  ON "automation_executions"("status", "updatedAt");
