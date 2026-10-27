-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('ASIL', 'ONURSAL', 'FAHRI', 'DESTEKCI');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'PASSIVE', 'RESIGNED', 'DECEASED');

-- CreateTable
CREATE TABLE "MemberCounter" (
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MemberCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "membershipNumber" TEXT NOT NULL,
    "type" "MembershipType" NOT NULL DEFAULT 'ASIL',
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "tcKimlikNo" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "birthDate" DATE,
    "profession" TEXT,
    "joinDate" DATE NOT NULL,
    "exitDate" DATE,
    "exitReason" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedByLabel" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "deletedByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberNote" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_membershipNumber_key" ON "Member"("membershipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Member_tcKimlikNo_key" ON "Member"("tcKimlikNo");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE INDEX "Member_type_idx" ON "Member"("type");

-- CreateIndex
CREATE INDEX "Member_lastName_firstName_idx" ON "Member"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Member_joinDate_idx" ON "Member"("joinDate");

-- CreateIndex
CREATE INDEX "Member_email_idx" ON "Member"("email");

-- CreateIndex
CREATE INDEX "Member_deletedAt_idx" ON "Member"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Member_year_sequence_key" ON "Member"("year", "sequence");

-- CreateIndex
CREATE INDEX "MemberNote_memberId_createdAt_idx" ON "MemberNote"("memberId", "createdAt");

-- AddForeignKey
ALTER TABLE "MemberNote" ADD CONSTRAINT "MemberNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
