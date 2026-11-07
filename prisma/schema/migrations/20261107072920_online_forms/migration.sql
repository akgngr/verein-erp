-- CreateEnum
CREATE TYPE "OnlineFormKind" AS ENUM ('MEMBER', 'STUDENT', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "OnlineFormStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "photoConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "privacyConsentAt" DATE;

-- CreateTable
CREATE TABLE "online_form_requests" (
    "id" TEXT NOT NULL,
    "kind" "OnlineFormKind" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "signerId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "status" "OnlineFormStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "signerName" TEXT,
    "signatureEnc" TEXT,
    "consents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidenceHash" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "online_form_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "online_form_requests_tokenHash_key" ON "online_form_requests"("tokenHash");

-- CreateIndex
CREATE INDEX "online_form_requests_kind_subjectId_idx" ON "online_form_requests"("kind", "subjectId");

-- CreateIndex
CREATE INDEX "online_form_requests_status_expiresAt_idx" ON "online_form_requests"("status", "expiresAt");

