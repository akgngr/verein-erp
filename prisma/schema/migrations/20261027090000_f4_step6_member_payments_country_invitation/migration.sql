-- Faz 4 Adım 6: evrak taşıma yöntemi enum düzeltmesi (4.4), toplantı davet tarihi (4.5),
-- üye ülke + fesih bildirimi (4.6) ve minimum aidat altyapısı (KARAR: MemberPayment Faz 3'te yoktu).

-- 4.4: KEP → REGISTERED_MAIL yeniden adlandırma (mevcut veriler korunur) ve FAX eki.
-- KARAR: Prisma diff'i burada tip değiştirme (new/old enum) üretti; spec 4.4'ün istediği
-- RENAME VALUE + ADD VALUE biçimi daha basittir ve veriyi aynen korur.
ALTER TYPE "DeliveryMethod" RENAME VALUE 'KEP' TO 'REGISTERED_MAIL';
ALTER TYPE "DeliveryMethod" ADD VALUE 'FAX';

-- 4.5: davet gönderim tarihi.
ALTER TABLE "Meeting" ADD COLUMN "invitationSentAt" DATE;

-- 4.6: ülke ve fesih bildirimi tarihi.
ALTER TABLE "Member" ADD COLUMN "cancellationReceivedAt" DATE,
ADD COLUMN "country" TEXT;

-- 4.6 (KARAR): aidat ödemesi + makbuz numarası sayacı.
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'OTHER');

CREATE TABLE "MemberPaymentCounter" (
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MemberPaymentCounter_pkey" PRIMARY KEY ("year")
);

CREATE TABLE "MemberPayment" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "dueYear" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paidAt" DATE NOT NULL,
    "reference" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidedByLabel" TEXT,
    "voidReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberPayment_receiptNumber_key" ON "MemberPayment"("receiptNumber");
CREATE INDEX "MemberPayment_memberId_idx" ON "MemberPayment"("memberId");
CREATE INDEX "MemberPayment_paidAt_idx" ON "MemberPayment"("paidAt");
CREATE INDEX "MemberPayment_dueYear_idx" ON "MemberPayment"("dueYear");
CREATE UNIQUE INDEX "MemberPayment_year_sequence_key" ON "MemberPayment"("year", "sequence");

ALTER TABLE "MemberPayment" ADD CONSTRAINT "MemberPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
