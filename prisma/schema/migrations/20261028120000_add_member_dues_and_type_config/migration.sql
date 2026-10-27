-- Faz 3 eklemeleri: yıllık aidat satırı (MemberDue) + üyelik türü konfigürasyonu
-- (MembershipTypeConfig). Mevcut tablolar değişmez (additive migration).

CREATE TYPE "MemberDueStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'WAIVED');

CREATE TABLE "MembershipTypeConfig" (
    "type" "MembershipType" NOT NULL,
    "annualDue" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipTypeConfig_pkey" PRIMARY KEY ("type")
);

CREATE TABLE "MemberDue" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "status" "MemberDueStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" DATE NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberDue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberDue_memberId_year_key" ON "MemberDue"("memberId" ASC, "year" ASC);
CREATE INDEX "MemberDue_year_status_idx" ON "MemberDue"("year" ASC, "status" ASC);

ALTER TABLE "MemberDue" ADD CONSTRAINT "MemberDue_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
