-- Faz 5 Adım 3 (§ 4): Gemeinnützigkeit alanları — Zuwendungsbestätigung için.
CREATE TYPE "ExemptionDocumentType" AS ENUM ('EXEMPTION_NOTICE', 'TAX_ASSESSMENT_ANNEX', 'SPECIAL_ASSESSMENT_60A');

ALTER TABLE "OrganizationProfile" ADD COLUMN "charitablePurposes" TEXT,
ADD COLUMN "exemptionDocumentType" "ExemptionDocumentType",
ADD COLUMN "membershipFeesDeductible" BOOLEAN NOT NULL DEFAULT false;
