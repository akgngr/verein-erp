-- ACC-5: incoming invoices (payables), XRechnung seller data
-- CreateEnum
CREATE TYPE "PayableStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "AccountingInvoice" ADD COLUMN     "buyerReference" TEXT;

-- AlterTable
ALTER TABLE "AccountingInvoiceSettings" ADD COLUMN     "bic" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "sellerVatId" TEXT;

-- CreateTable
CREATE TABLE "AccountingPayable" (
    "id" TEXT NOT NULL,
    "status" "PayableStatus" NOT NULL DEFAULT 'DRAFT',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "contactId" TEXT,
    "supplierName" TEXT NOT NULL DEFAULT '',
    "supplierVatId" TEXT,
    "supplierTaxNumber" TEXT,
    "supplierAddress" TEXT,
    "supplierIban" TEXT,
    "number" TEXT,
    "issueDate" DATE,
    "dueDate" DATE,
    "serviceDate" TEXT,
    "categoryId" TEXT,
    "byRate" JSONB NOT NULL DEFAULT '[]',
    "netCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "grossCents" INTEGER NOT NULL DEFAULT 0,
    "paidCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "originalName" TEXT,
    "storagePath" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "sha256" TEXT,
    "paidAt" DATE,
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPayable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingPayable_status_dueDate_idx" ON "AccountingPayable"("status", "dueDate");

-- CreateIndex
CREATE INDEX "AccountingPayable_sha256_idx" ON "AccountingPayable"("sha256");

