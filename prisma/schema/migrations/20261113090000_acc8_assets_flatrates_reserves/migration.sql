-- ACC-8: asset register (AfA), flat-rate expenses, reserves (§ 62 AO)
-- AlterTable
ALTER TABLE "AccountingCategory" ADD COLUMN     "isAsset" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AccountingSettings" ADD COLUMN     "vatExtension" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AccountingAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acquisitionDate" DATE NOT NULL,
    "costCents" INTEGER NOT NULL,
    "usefulLifeMonths" INTEGER NOT NULL DEFAULT 36,
    "method" TEXT NOT NULL DEFAULT 'LINEAR',
    "bookingId" TEXT,
    "disposalDate" DATE,
    "disposalNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingFlatRate" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingFlatRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingReserve" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "plannedUseYear" INTEGER,
    "releasedYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingReserve_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingAsset_acquisitionDate_idx" ON "AccountingAsset"("acquisitionDate");

-- CreateIndex
CREATE INDEX "AccountingFlatRate_date_idx" ON "AccountingFlatRate"("date");

-- CreateIndex
CREATE INDEX "AccountingReserve_year_idx" ON "AccountingReserve"("year");

