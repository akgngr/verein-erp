-- ACC-2: DATEV EXTF header settings
ALTER TABLE "AccountingSettings" ADD COLUMN "datevConsultantNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AccountingSettings" ADD COLUMN "datevClientNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AccountingSettings" ADD COLUMN "datevTaxKeys" BOOLEAN NOT NULL DEFAULT false;
