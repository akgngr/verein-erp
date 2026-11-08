-- CreateEnum
CREATE TYPE "EInvoiceRecipientType" AS ENUM ('B2B', 'B2C', 'PUBLIC');

-- AlterTable
ALTER TABLE "AccountingSettings" ADD COLUMN     "einvoiceMode" TEXT NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "previousYearRevenueCents" INTEGER;

-- AlterTable
ALTER TABLE "AccountingContact" ADD COLUMN     "einvoiceType" "EInvoiceRecipientType" NOT NULL DEFAULT 'B2B',
ADD COLUMN     "leitwegId" TEXT;

