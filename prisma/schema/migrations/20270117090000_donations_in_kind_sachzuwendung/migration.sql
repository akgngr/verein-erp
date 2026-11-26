-- Roadmap E2.5 (#618): BMF Sachzuwendung support on Donation and ZuwendungConfirmation.
ALTER TYPE "DonationMethod" ADD VALUE IF NOT EXISTS 'IN_KIND';
ALTER TYPE "ConfirmationContent" ADD VALUE IF NOT EXISTS 'IN_KIND_DONATION';

CREATE TYPE "InKindOrigin" AS ENUM ('BUSINESS_ASSETS', 'PRIVATE_ASSETS', 'UNKNOWN');

ALTER TABLE "Donation"
  ADD COLUMN "itemDescription" TEXT,
  ADD COLUMN "inKindOrigin" "InKindOrigin",
  ADD COLUMN "valuationRecordsAvailable" BOOLEAN NOT NULL DEFAULT false;
