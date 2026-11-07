-- AlterTable
ALTER TABLE "AccountingInvoiceSettings" ADD COLUMN     "kositValidatorUrl" TEXT;

-- AlterTable
ALTER TABLE "AccountingPayable" ADD COLUMN     "einvoiceIssues" JSONB;

