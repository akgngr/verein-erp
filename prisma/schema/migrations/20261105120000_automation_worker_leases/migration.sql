-- Worker leases use a monotonically increasing fencing token. A worker may
-- heartbeat or finalize only while it still owns the current token.
ALTER TABLE "automation_executions"
  ADD COLUMN "heartbeatAt" TIMESTAMP(3),
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "leaseToken" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "automation_executions_status_leaseExpiresAt_idx"
  ON "automation_executions"("status", "leaseExpiresAt");

-- PROCESSING is a recoverable claim state. Expired claims can be acquired by
-- another dispatcher after a process crash.
ALTER TYPE "AutomationOutboxStatus" ADD VALUE 'PROCESSING';

ALTER TABLE "automation_outbox"
  ADD COLUMN "claimOwner" TEXT,
  ADD COLUMN "claimExpiresAt" TIMESTAMP(3);

CREATE INDEX "automation_outbox_status_claimExpiresAt_idx"
  ON "automation_outbox"("status", "claimExpiresAt");
