-- CreateEnum
CREATE TYPE "TeacherCompensation" AS ENUM ('NONE', 'HONORAR', 'UEBUNGSLEITER', 'EHRENAMT');

-- CreateEnum
CREATE TYPE "TeacherRateUnit" AS ENUM ('HOUR', 'SESSION');

-- CreateEnum
CREATE TYPE "TeacherPayoutStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "courses_settings" ADD COLUMN     "defaultSessionMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "ehrenamtLimitCents" INTEGER NOT NULL DEFAULT 96000,
ADD COLUMN     "payoutCategoryId" TEXT,
ADD COLUMN     "uebungsleiterLimitCents" INTEGER NOT NULL DEFAULT 330000;

-- AlterTable
ALTER TABLE "courses_teachers" ADD COLUMN     "compensation" "TeacherCompensation" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "rateCents" INTEGER,
ADD COLUMN     "rateUnit" "TeacherRateUnit" NOT NULL DEFAULT 'HOUR';

-- CreateTable
CREATE TABLE "courses_teacher_payouts" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "TeacherPayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "number" TEXT,
    "year" INTEGER,
    "sequence" INTEGER,
    "compensation" "TeacherCompensation" NOT NULL,
    "rateCents" INTEGER NOT NULL,
    "rateUnit" "TeacherRateUnit" NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "lines" JSONB NOT NULL,
    "bookingNumber" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByLabel" TEXT,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_teacher_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courses_teacher_payouts_number_key" ON "courses_teacher_payouts"("number");

-- CreateIndex
CREATE INDEX "courses_teacher_payouts_teacherId_period_idx" ON "courses_teacher_payouts"("teacherId", "period");

-- CreateIndex
CREATE INDEX "courses_teacher_payouts_period_status_idx" ON "courses_teacher_payouts"("period", "status");

-- CreateIndex
CREATE UNIQUE INDEX "courses_teacher_payouts_year_sequence_key" ON "courses_teacher_payouts"("year", "sequence");

-- AddForeignKey
ALTER TABLE "courses_teacher_payouts" ADD CONSTRAINT "courses_teacher_payouts_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "courses_teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

