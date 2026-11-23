-- CreateTable
CREATE TABLE "system_egress_ledger" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "count" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'requests',
    "legalBasis" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_egress_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_egress_ledger_occurredAt_idx" ON "system_egress_ledger"("occurredAt");

-- CreateIndex
CREATE INDEX "system_egress_ledger_moduleKey_occurredAt_idx" ON "system_egress_ledger"("moduleKey", "occurredAt");

-- CreateIndex
CREATE INDEX "system_egress_ledger_provider_occurredAt_idx" ON "system_egress_ledger"("provider", "occurredAt");
