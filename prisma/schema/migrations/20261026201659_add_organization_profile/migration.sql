-- CreateTable
CREATE TABLE "OrganizationProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'Deutschland',
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "registerCourt" TEXT,
    "registerNumber" TEXT,
    "taxNumber" TEXT,
    "taxOffice" TEXT,
    "exemptionNoticeDate" DATE,
    "exemptionNoticePeriod" TEXT,
    "updatedById" TEXT,
    "updatedByLabel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);
