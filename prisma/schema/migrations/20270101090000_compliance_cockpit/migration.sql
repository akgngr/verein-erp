-- CreateTable
CREATE TABLE "compliance_rule_states" (
    "ruleId" TEXT NOT NULL,
    "disabled" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_rule_states_pkey" PRIMARY KEY ("ruleId")
);

-- CreateTable
CREATE TABLE "compliance_findings" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "refKey" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_findings_period_idx" ON "compliance_findings"("period");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_findings_ruleId_period_refKey_key" ON "compliance_findings"("ruleId", "period", "refKey");

