-- ACC-4: bank statement import (CAMT.053, MT940, CSV), matching rules
-- CreateEnum
CREATE TYPE "BankTransactionStatus" AS ENUM ('OPEN', 'BOOKED', 'PRIVATE', 'IGNORED');

-- CreateEnum
CREATE TYPE "BankRuleField" AS ENUM ('COUNTERPARTY', 'PURPOSE');

-- CreateTable
CREATE TABLE "AccountingBankImport" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "newCount" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingBankImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingBankTransaction" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "bookingDate" DATE NOT NULL,
    "valueDate" DATE,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "counterpartyName" TEXT,
    "counterpartyIban" TEXT,
    "purpose" TEXT NOT NULL,
    "reference" TEXT,
    "status" "BankTransactionStatus" NOT NULL DEFAULT 'OPEN',
    "bookingIds" TEXT,
    "invoiceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingBankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingBankRule" (
    "id" TEXT NOT NULL,
    "field" "BankRuleField" NOT NULL,
    "pattern" TEXT NOT NULL,
    "direction" "BookingType" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "taxRate" INTEGER NOT NULL DEFAULT 0,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingBankRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingBankTransaction_hash_key" ON "AccountingBankTransaction"("hash");

-- CreateIndex
CREATE INDEX "AccountingBankTransaction_accountId_status_bookingDate_idx" ON "AccountingBankTransaction"("accountId", "status", "bookingDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingBankRule_field_pattern_direction_key" ON "AccountingBankRule"("field", "pattern", "direction");

-- AddForeignKey
ALTER TABLE "AccountingBankTransaction" ADD CONSTRAINT "AccountingBankTransaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "AccountingBankImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

