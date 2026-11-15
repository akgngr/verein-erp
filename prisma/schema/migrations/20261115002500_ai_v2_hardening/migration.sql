-- Additive follow-up to the already merged runtime migration.
ALTER TABLE "ai_usage_buckets" ADD COLUMN "costMicros" INTEGER NOT NULL DEFAULT 0;

-- Preserve history on upgrade. Never silently delete or relabel ambiguous claims.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ai_turn_claims" GROUP BY "userId", "requestKey" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'AI turn request keys conflict; inspect duplicate claims before applying the unique index';
  END IF;
END $$;
CREATE UNIQUE INDEX "ai_turn_claims_userId_requestKey_key" ON "ai_turn_claims"("userId", "requestKey");
