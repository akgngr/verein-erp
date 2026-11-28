-- CreateTable
CREATE TABLE "sponsors_records" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'SUPPORTER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsors_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sponsors_records_name_idx" ON "sponsors_records"("name");

-- CreateIndex
CREATE INDEX "sponsors_records_status_idx" ON "sponsors_records"("status");

-- CreateIndex
CREATE INDEX "sponsors_records_tier_idx" ON "sponsors_records"("tier");
