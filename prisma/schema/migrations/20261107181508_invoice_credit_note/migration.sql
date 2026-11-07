-- AlterEnum
ALTER TYPE "InvoiceKind" ADD VALUE 'CREDIT_NOTE';

-- AlterTable
ALTER TABLE "AccountingInvoice" ADD COLUMN     "correctsInvoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AccountingInvoice_correctsInvoiceId_key" ON "AccountingInvoice"("correctsInvoiceId");

