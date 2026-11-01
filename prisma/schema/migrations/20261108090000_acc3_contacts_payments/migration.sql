-- ACC-3: contacts (Debitoren/Kreditoren), quotes, partial payments + Skonto
-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- AlterEnum
ALTER TYPE "InvoiceKind" ADD VALUE 'QUOTE';

-- AlterTable
ALTER TABLE "AccountingInvoice" ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "paidCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skontoCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AccountingContact" (
    "id" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "vatId" TEXT,
    "paymentTermDays" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingInvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paidDate" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "skontoCents" INTEGER NOT NULL DEFAULT 0,
    "accountId" TEXT NOT NULL,
    "bookingNumbers" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingInvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingContact_number_key" ON "AccountingContact"("number");

-- CreateIndex
CREATE INDEX "AccountingContact_type_name_idx" ON "AccountingContact"("type", "name");

-- CreateIndex
CREATE INDEX "AccountingInvoicePayment_invoiceId_idx" ON "AccountingInvoicePayment"("invoiceId");

-- AddForeignKey
ALTER TABLE "AccountingInvoice" ADD CONSTRAINT "AccountingInvoice_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "AccountingContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingInvoicePayment" ADD CONSTRAINT "AccountingInvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "AccountingInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Backfill: already paid invoices are fully settled
UPDATE "AccountingInvoice" SET "paidCents" = "grossCents" WHERE "status" = 'PAID';
