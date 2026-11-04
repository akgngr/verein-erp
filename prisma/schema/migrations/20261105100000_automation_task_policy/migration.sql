-- Persist the normalized task retry policy so the execution record and
-- pg-boss transport use the same settings for every attempt.
ALTER TABLE "automation_executions"
  ADD COLUMN "retryPolicy" JSONB NOT NULL
  DEFAULT '{"maxAttempts":3,"initialDelaySeconds":30,"maxDelaySeconds":1800,"backoffMultiplier":2}'::jsonb;

ALTER TABLE "automation_step_runs"
  ADD COLUMN "retryPolicy" JSONB NOT NULL
  DEFAULT '{"maxAttempts":3,"initialDelaySeconds":30,"maxDelaySeconds":1800,"backoffMultiplier":2}'::jsonb;

-- Preserve any non-default attempt limits written by the previous execution API.
UPDATE "automation_executions"
SET "retryPolicy" = jsonb_set("retryPolicy", '{maxAttempts}', to_jsonb("maxAttempts"), true);

UPDATE "automation_step_runs"
SET "retryPolicy" = jsonb_set("retryPolicy", '{maxAttempts}', to_jsonb("maxAttempts"), true);
