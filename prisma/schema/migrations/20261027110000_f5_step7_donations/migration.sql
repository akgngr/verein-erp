-- CreateEnum
CREATE TYPE "DonorType" AS ENUM ('PERSON', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "DonationMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'PAYPAL', 'REIMBURSEMENT_WAIVER', 'OTHER');

-- CreateEnum
CREATE TYPE "ConfirmationKind" AS ENUM ('SINGLE', 'COLLECTIVE');

-- CreateEnum
CREATE TYPE "ConfirmationContent" AS ENUM ('DONATION', 'MEMBERSHIP_FEE');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConfirmationItemType" AS ENUM ('DONATION', 'MEMBER_PAYMENT');

-- CreateEnum
CREATE TYPE "DonationsCounterKind" AS ENUM ('DONOR', 'DONATION', 'CONFIRMATION');

-- CreateTable
CREATE TABLE "DonationsCounter" (
    "kind" "DonationsCounterKind" NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DonationsCounter_pkey" PRIMARY KEY ("kind","year")
);

-- CreateTable
CREATE TABLE "Donor" (
    "id" TEXT NOT NULL,
    "donorNumber" INTEGER NOT NULL,
    "type" "DonorType" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "organizationName" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'Deutschland',
    "email" TEXT,
    "phone" TEXT,
    "memberId" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAnonymized" BOOLEAN NOT NULL DEFAULT false,
    "anonymizedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "donationNumber" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "donorId" TEXT NOT NULL,
    "receivedAt" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "DonationMethod" NOT NULL,
    "reference" TEXT,
    "purposeNote" TEXT,
    "waivedReimbursement" BOOLEAN NOT NULL DEFAULT false,
    "claimBasis" TEXT,
    "waiverDeclaredAt" DATE,
    "expenseCategoryId" TEXT,
    "bookingNumber" TEXT,
    "waiverBookingNumber" TEXT,
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

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZuwendungConfirmation" (
    "id" TEXT NOT NULL,
    "confirmationNumber" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" "ConfirmationKind" NOT NULL,
    "content" "ConfirmationContent" NOT NULL,
    "donorId" TEXT,
    "memberId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientStreet" TEXT NOT NULL,
    "recipientPostalCode" TEXT NOT NULL,
    "recipientCity" TEXT NOT NULL,
    "recipientCountry" TEXT,
    "periodFrom" DATE NOT NULL,
    "periodTo" DATE NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "amountInWords" TEXT NOT NULL,
    "waivedReimbursement" BOOLEAN NOT NULL,
    "issuerSnapshot" JSONB NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedPlace" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issuedByLabel" TEXT NOT NULL,
    "status" "ConfirmationStatus" NOT NULL DEFAULT 'ISSUED',
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelledByLabel" TEXT,
    "cancelReason" TEXT,
    "replacesId" TEXT,
    "pdfStoragePath" TEXT,
    "pdfSha256" TEXT,
    "pdfSize" INTEGER,

    CONSTRAINT "ZuwendungConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZuwendungConfirmationItem" (
    "id" TEXT NOT NULL,
    "confirmationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "itemType" "ConfirmationItemType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "itemDate" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "label" TEXT NOT NULL,
    "waived" BOOLEAN NOT NULL,
    "activeKey" TEXT,

    CONSTRAINT "ZuwendungConfirmationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationsSettings" (
    "id" TEXT NOT NULL,
    "templateConfirmedVersion" TEXT,
    "templateConfirmedAt" TIMESTAMP(3),
    "templateConfirmedById" TEXT,
    "templateConfirmedByLabel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationsSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Donor_donorNumber_key" ON "Donor"("donorNumber");

-- CreateIndex
CREATE INDEX "Donor_lastName_firstName_idx" ON "Donor"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Donor_organizationName_idx" ON "Donor"("organizationName");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_donationNumber_key" ON "Donation"("donationNumber");

-- CreateIndex
CREATE INDEX "Donation_donorId_idx" ON "Donation"("donorId");

-- CreateIndex
CREATE INDEX "Donation_receivedAt_idx" ON "Donation"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_year_sequence_key" ON "Donation"("year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ZuwendungConfirmation_confirmationNumber_key" ON "ZuwendungConfirmation"("confirmationNumber");

-- CreateIndex
CREATE INDEX "ZuwendungConfirmation_donorId_idx" ON "ZuwendungConfirmation"("donorId");

-- CreateIndex
CREATE INDEX "ZuwendungConfirmation_memberId_idx" ON "ZuwendungConfirmation"("memberId");

-- CreateIndex
CREATE INDEX "ZuwendungConfirmation_status_idx" ON "ZuwendungConfirmation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ZuwendungConfirmation_year_sequence_key" ON "ZuwendungConfirmation"("year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ZuwendungConfirmationItem_activeKey_key" ON "ZuwendungConfirmationItem"("activeKey");

-- CreateIndex
CREATE INDEX "ZuwendungConfirmationItem_confirmationId_idx" ON "ZuwendungConfirmationItem"("confirmationId");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZuwendungConfirmation" ADD CONSTRAINT "ZuwendungConfirmation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZuwendungConfirmation" ADD CONSTRAINT "ZuwendungConfirmation_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "ZuwendungConfirmation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZuwendungConfirmationItem" ADD CONSTRAINT "ZuwendungConfirmationItem_confirmationId_fkey" FOREIGN KEY ("confirmationId") REFERENCES "ZuwendungConfirmation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Faz 5 Adım 7 (§ 10): değişmezlik tetikleyicileri (prevent_mutation Faz 4'ten).
CREATE TRIGGER donations_no_delete
  BEFORE DELETE ON "Donation"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

CREATE TRIGGER zuwendung_confirmation_no_delete
  BEFORE DELETE ON "ZuwendungConfirmation"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

CREATE TRIGGER zuwendung_confirmation_item_no_delete
  BEFORE DELETE ON "ZuwendungConfirmationItem"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

-- Bildirimin korunan kolonları DEĞİŞTİRİLEMEZ (§ 10): PDF kolonları yalnızca
-- NULL → değer (bir kez); status yalnızca ISSUED → CANCELLED.
CREATE OR REPLACE FUNCTION confirmation_protected_columns() RETURNS trigger AS $$
BEGIN
  IF NEW."confirmationNumber" <> OLD."confirmationNumber"
     OR NEW."year" <> OLD."year"
     OR NEW."sequence" <> OLD."sequence"
     OR NEW."kind"::text <> OLD."kind"::text
     OR NEW."content"::text <> OLD."content"::text
     OR NEW."donorId" IS DISTINCT FROM OLD."donorId"
     OR NEW."memberId" IS DISTINCT FROM OLD."memberId"
     OR NEW."recipientName" <> OLD."recipientName"
     OR NEW."recipientStreet" <> OLD."recipientStreet"
     OR NEW."recipientPostalCode" <> OLD."recipientPostalCode"
     OR NEW."recipientCity" <> OLD."recipientCity"
     OR NEW."recipientCountry" IS DISTINCT FROM OLD."recipientCountry"
     OR NEW."periodFrom" <> OLD."periodFrom"
     OR NEW."periodTo" <> OLD."periodTo"
     OR NEW."totalAmount" <> OLD."totalAmount"
     OR NEW."amountInWords" <> OLD."amountInWords"
     OR NEW."waivedReimbursement" <> OLD."waivedReimbursement"
     OR NEW."issuerSnapshot" IS DISTINCT FROM OLD."issuerSnapshot"
     OR NEW."templateVersion" <> OLD."templateVersion"
     OR NEW."issuedAt" <> OLD."issuedAt"
     OR NEW."issuedPlace" <> OLD."issuedPlace"
     OR NEW."issuedById" <> OLD."issuedById"
     OR NEW."issuedByLabel" <> OLD."issuedByLabel" THEN
    RAISE EXCEPTION 'Protected columns of ZuwendungConfirmation are immutable';
  END IF;
  IF OLD."pdfStoragePath" IS NULL AND NEW."pdfStoragePath" IS NOT NULL THEN
    -- NULL → değer: depolanmış PDF yazımı (izinli; sonrası değişmez).
    NULL;
  ELSIF NEW."pdfStoragePath" IS DISTINCT FROM OLD."pdfStoragePath"
     OR NEW."pdfSha256" IS DISTINCT FROM OLD."pdfSha256"
     OR NEW."pdfSize" IS DISTINCT FROM OLD."pdfSize" THEN
    RAISE EXCEPTION 'PDF columns of ZuwendungConfirmation may only change from NULL to a value once';
  END IF;
  IF OLD."status"::text = 'ISSUED' AND NEW."status"::text = 'CANCELLED' THEN
    -- ISSUED → CANCELLED izinli.
    NULL;
  ELSIF OLD."status"::text <> NEW."status"::text THEN
    RAISE EXCEPTION 'Status of ZuwendungConfirmation may only change ISSUED to CANCELLED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zuwendung_confirmation_protected
  BEFORE UPDATE ON "ZuwendungConfirmation"
  FOR EACH ROW EXECUTE FUNCTION confirmation_protected_columns();

-- Item: yalnızca activeKey değişebilir ve yalnızca NULL'a inebilir (§ 10).
CREATE OR REPLACE FUNCTION confirmation_item_protected() RETURNS trigger AS $$
BEGIN
  IF NEW."confirmationId" <> OLD."confirmationId"
     OR NEW."position" <> OLD."position"
     OR NEW."itemType"::text <> OLD."itemType"::text
     OR NEW."sourceId" <> OLD."sourceId"
     OR NEW."itemDate" <> OLD."itemDate"
     OR NEW."amount" <> OLD."amount"
     OR NEW."label" <> OLD."label"
     OR NEW."waived" <> OLD."waived" THEN
    RAISE EXCEPTION 'Columns of ZuwendungConfirmationItem other than activeKey are immutable';
  END IF;
  IF OLD."activeKey" IS NOT NULL AND NEW."activeKey" IS NOT NULL THEN
    RAISE EXCEPTION 'activeKey of ZuwendungConfirmationItem may only change to NULL';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zuwendung_confirmation_item_protected
  BEFORE UPDATE ON "ZuwendungConfirmationItem"
  FOR EACH ROW EXECUTE FUNCTION confirmation_item_protected();
