-- CreateEnum
CREATE TYPE "SepaRunSource" AS ENUM ('MEMBER_DUES', 'COURSE_FEES');

-- CreateEnum
CREATE TYPE "SepaRunStatus" AS ENUM ('CREATED', 'COLLECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SepaItemStatus" AS ENUM ('PENDING', 'COLLECTED', 'RETURNED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'SEPA_DEBIT';

-- AlterTable
ALTER TABLE "AccountingInvoiceSettings" ADD COLUMN     "sepaCreditorId" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "sepaAccountHolder" TEXT,
ADD COLUMN     "sepaBic" TEXT,
ADD COLUMN     "sepaIban" TEXT,
ADD COLUMN     "sepaMandateDate" DATE,
ADD COLUMN     "sepaMandateReference" TEXT;

-- CreateTable
CREATE TABLE "sepa_debit_runs" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "source" "SepaRunSource" NOT NULL,
    "sourceParam" TEXT NOT NULL,
    "collectionDate" DATE NOT NULL,
    "status" "SepaRunStatus" NOT NULL DEFAULT 'CREATED',
    "totalCents" INTEGER NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "xmlEnc" TEXT NOT NULL,
    "collectedAt" DATE,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sepa_debit_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sepa_debit_items" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "debtorName" TEXT NOT NULL,
    "ibanMasked" TEXT NOT NULL,
    "mandateReference" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "endToEndId" TEXT NOT NULL,
    "remittance" TEXT NOT NULL,
    "status" "SepaItemStatus" NOT NULL DEFAULT 'PENDING',
    "receipt" TEXT,
    "returnReason" TEXT,

    CONSTRAINT "sepa_debit_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sepa_debit_runs_number_key" ON "sepa_debit_runs"("number");

-- CreateIndex
CREATE UNIQUE INDEX "sepa_debit_runs_year_sequence_key" ON "sepa_debit_runs"("year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "sepa_debit_items_endToEndId_key" ON "sepa_debit_items"("endToEndId");

-- CreateIndex
CREATE INDEX "sepa_debit_items_runId_idx" ON "sepa_debit_items"("runId");

-- CreateIndex
CREATE INDEX "sepa_debit_items_sourceKey_status_idx" ON "sepa_debit_items"("sourceKey", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Member_sepaMandateReference_key" ON "Member"("sepaMandateReference");

-- AddForeignKey
ALTER TABLE "sepa_debit_items" ADD CONSTRAINT "sepa_debit_items_runId_fkey" FOREIGN KEY ("runId") REFERENCES "sepa_debit_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

