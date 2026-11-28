-- CreateEnum
CREATE TYPE "GrantFinancingType" AS ENUM ('FEHLBEDARF', 'ANTEIL', 'FESTBETRAG');

-- AlterTable
ALTER TABLE "grants" ADD COLUMN "financingType" "GrantFinancingType" NOT NULL DEFAULT 'FEHLBEDARF',
ADD COLUMN "sharePercent" INTEGER;
