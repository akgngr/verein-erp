-- ACC-1 vergi temeli: fişte KDV (net/vergi/oran), hesap planı numaraları, vergi ayarları.

-- Fiş: mevcut tüm fişler KDV'siz kabul edilir (net = brüt, vergi = 0, oran = 0); raporlar değişmez.
ALTER TABLE "AccountingBooking" ADD COLUMN "taxRate" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountingBooking" ADD COLUMN "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "AccountingBooking" ADD COLUMN "netAmount" DECIMAL(12,2);
UPDATE "AccountingBooking" SET "netAmount" = "amount";
ALTER TABLE "AccountingBooking" ALTER COLUMN "netAmount" SET NOT NULL;
ALTER TABLE "AccountingBooking" ADD CONSTRAINT "AccountingBooking_tax_split_check"
  CHECK ("netAmount" + "taxAmount" = "amount" AND "taxRate" IN (0, 7, 19));

-- Hesap planı numaraları
ALTER TABLE "AccountingAccount" ADD COLUMN "accountNumber" TEXT;
ALTER TABLE "AccountingCategory" ADD COLUMN "accountNumber" TEXT;
ALTER TABLE "AccountingCategory" ADD COLUMN "defaultTaxRate" INTEGER NOT NULL DEFAULT 0;

-- Vergi ayarları
ALTER TABLE "AccountingSettings" ADD COLUMN "chartOfAccounts" TEXT NOT NULL DEFAULT 'SKR03';
ALTER TABLE "AccountingSettings" ADD COLUMN "smallBusiness" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AccountingSettings" ADD COLUMN "taxMethod" TEXT NOT NULL DEFAULT 'IST';
ALTER TABLE "AccountingSettings" ADD COLUMN "vatPeriod" TEXT NOT NULL DEFAULT 'QUARTER';
