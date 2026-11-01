-- ACC-6: dunning (reminders, fees, § 288 BGB interest)
-- AlterTable
ALTER TABLE "AccountingInvoiceSettings" ADD COLUMN     "baseInterestRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "dunningFeeFirst" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "dunningFeeReminder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dunningFeeSecond" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "dunningFlatFeeB2B" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dunningIntervalDays" INTEGER NOT NULL DEFAULT 14;

-- CreateTable
CREATE TABLE "AccountingDunning" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "dunningDate" DATE NOT NULL,
    "newDueDate" DATE NOT NULL,
    "openCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "interestCents" INTEGER NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "flatFeeCents" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingDunning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingDunning_dunningDate_idx" ON "AccountingDunning"("dunningDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingDunning_invoiceId_level_key" ON "AccountingDunning"("invoiceId", "level");

-- AddForeignKey
ALTER TABLE "AccountingDunning" ADD CONSTRAINT "AccountingDunning_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "AccountingInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

