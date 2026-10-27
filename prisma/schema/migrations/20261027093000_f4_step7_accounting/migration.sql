-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "CategoryDirection" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "Sphere" AS ENUM ('IDEELL', 'ASSET_MANAGEMENT', 'PURPOSE_OPERATION', 'ECONOMIC_OPERATION');

-- CreateTable
CREATE TABLE "AccountingCounter" (
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AccountingCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "AccountingAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "openingDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" "CategoryDirection" NOT NULL,
    "sphere" "Sphere" NOT NULL,
    "helpText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingBooking" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "type" "BookingType" NOT NULL,
    "bookingDate" DATE NOT NULL,
    "accountId" TEXT NOT NULL,
    "counterAccountId" TEXT,
    "categoryId" TEXT,
    "projectId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "counterparty" TEXT,
    "receiptReference" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversedByLabel" TEXT,
    "reverseReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingBookingFile" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "deletedByLabel" TEXT,

    CONSTRAINT "AccountingBookingFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingYear" (
    "year" INTEGER NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "lockedByLabel" TEXT,

    CONSTRAINT "AccountingYear_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "AccountingBudgetLine" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingBudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingSettings" (
    "id" TEXT NOT NULL,
    "memberFeeCategoryId" TEXT,
    "cashAccountId" TEXT,
    "bankAccountId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAccount_name_key" ON "AccountingAccount"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingCategory_name_key" ON "AccountingCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingProject_name_key" ON "AccountingProject"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingBooking_bookingNumber_key" ON "AccountingBooking"("bookingNumber");

-- CreateIndex
CREATE INDEX "AccountingBooking_bookingDate_idx" ON "AccountingBooking"("bookingDate");

-- CreateIndex
CREATE INDEX "AccountingBooking_accountId_idx" ON "AccountingBooking"("accountId");

-- CreateIndex
CREATE INDEX "AccountingBooking_categoryId_idx" ON "AccountingBooking"("categoryId");

-- CreateIndex
CREATE INDEX "AccountingBooking_projectId_idx" ON "AccountingBooking"("projectId");

-- CreateIndex
CREATE INDEX "AccountingBooking_year_type_idx" ON "AccountingBooking"("year", "type");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingBooking_year_sequence_key" ON "AccountingBooking"("year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingBooking_sourceType_sourceId_key" ON "AccountingBooking"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingBookingFile_storedName_key" ON "AccountingBookingFile"("storedName");

-- CreateIndex
CREATE INDEX "AccountingBookingFile_bookingId_idx" ON "AccountingBookingFile"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingBudgetLine_year_categoryId_key" ON "AccountingBudgetLine"("year", "categoryId");

-- AddForeignKey
ALTER TABLE "AccountingBooking" ADD CONSTRAINT "AccountingBooking_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AccountingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingBooking" ADD CONSTRAINT "AccountingBooking_counterAccountId_fkey" FOREIGN KEY ("counterAccountId") REFERENCES "AccountingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingBooking" ADD CONSTRAINT "AccountingBooking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AccountingCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingBooking" ADD CONSTRAINT "AccountingBooking_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AccountingProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingBookingFile" ADD CONSTRAINT "AccountingBookingFile_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "AccountingBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingBudgetLine" ADD CONSTRAINT "AccountingBudgetLine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AccountingCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Faz 4 Adım 7: DB düzeyinde Koruma (§ 7):
--  - Fiş ve fiş dosyaları ASLA silinmez (BEFORE DELETE tetikleyici).
--  - Fişte numara/yıl/sıra/oluşturma zamanı DEĞİŞTİRİLEMEZ (BEFORE UPDATE tetikleyici).
-- prevent_mutation() fonksiyonu Faz 4 Adım 3 migration'ında (audit append-only) tanımlandı.
CREATE TRIGGER accounting_booking_no_delete
  BEFORE DELETE ON "AccountingBooking"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

CREATE TRIGGER accounting_booking_file_no_delete
  BEFORE DELETE ON "AccountingBookingFile"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

CREATE OR REPLACE FUNCTION accounting_booking_protected_columns() RETURNS trigger AS $$
BEGIN
  IF NEW."bookingNumber" <> OLD."bookingNumber"
     OR NEW."year" <> OLD."year"
     OR NEW."sequence" <> OLD."sequence"
     OR NEW."createdAt" <> OLD."createdAt" THEN
    RAISE EXCEPTION 'Protected columns of AccountingBooking are immutable (bookingNumber, year, sequence, createdAt)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounting_booking_no_renumber
  BEFORE UPDATE ON "AccountingBooking"
  FOR EACH ROW EXECUTE FUNCTION accounting_booking_protected_columns();
