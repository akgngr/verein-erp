-- CreateEnum
CREATE TYPE "CourseKind" AS ENUM ('COURSE', 'TUTORING');

-- CreateEnum
CREATE TYPE "CourseFeeType" AS ENUM ('FREE', 'ONE_TIME', 'MONTHLY', 'INSTALLMENTS');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CourseEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CourseChargeKind" AS ENUM ('ONE_TIME', 'INSTALLMENT', 'MONTH');

-- CreateEnum
CREATE TYPE "CourseChargeStatus" AS ENUM ('OPEN', 'PAID', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoursePaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'SEPA_DEBIT', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ProgressAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE');

-- CreateEnum
CREATE TYPE "ProgressAssessmentType" AS ENUM ('EXAM', 'HOMEWORK', 'ORAL', 'PROJECT', 'OTHER');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StudentGuardianRelation" AS ENUM ('MOTHER', 'FATHER', 'GUARDIAN', 'SELF', 'OTHER');

-- CreateTable
CREATE TABLE "courses_counters" (
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "courses_counters_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "courses_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "incomeCategoryId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses_teachers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "subjects" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses_courses" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "CourseKind" NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "description" TEXT,
    "level" TEXT,
    "location" TEXT,
    "scheduleNote" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "capacity" INTEGER,
    "feeType" "CourseFeeType" NOT NULL DEFAULT 'FREE',
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "installmentCount" INTEGER,
    "status" "CourseStatus" NOT NULL DEFAULT 'PLANNED',
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "courses_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses_course_teachers" (
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "courses_course_teachers_pkey" PRIMARY KEY ("courseId","teacherId")
);

-- CreateTable
CREATE TABLE "courses_sessions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "topic" TEXT,
    "teacherId" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses_enrollments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentLabel" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "payerGuardianId" TEXT,
    "payerLabel" TEXT,
    "payerDebtorNumber" INTEGER,
    "enrolledAt" DATE NOT NULL,
    "status" "CourseEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses_charges" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "kind" "CourseChargeKind" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "period" TEXT,
    "dueDate" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "CourseChargeStatus" NOT NULL DEFAULT 'OPEN',
    "waivedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses_payments" (
    "id" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "paidAt" DATE NOT NULL,
    "method" "CoursePaymentMethod" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reference" TEXT,
    "bookingNumber" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "reverseReason" TEXT,

    CONSTRAINT "courses_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_attendance" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "ProgressAttendanceStatus" NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedByLabel" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_notes" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "rating" INTEGER,
    "text" TEXT NOT NULL,
    "goals" TEXT,
    "authorId" TEXT NOT NULL,
    "authorLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_assessments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "ProgressAssessmentType" NOT NULL,
    "maxPoints" DECIMAL(7,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_grades" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "points" DECIMAL(7,2),
    "grade" TEXT,
    "comment" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students_counters" (
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "students_counters_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "students_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "datevConsultantNo" TEXT,
    "datevClientNo" TEXT,
    "debtorRangeStart" INTEGER NOT NULL DEFAULT 10000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students_guardians" (
    "id" TEXT NOT NULL,
    "debtorNumber" INTEGER NOT NULL,
    "salutation" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "street" TEXT,
    "houseNumber" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'DE',
    "email" TEXT,
    "phone" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "accountHolder" TEXT,
    "sepaMandateReference" TEXT,
    "sepaMandateDate" DATE,
    "memberId" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "students_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students_students" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" DATE,
    "school" TEXT,
    "gradeLevel" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "photoConsent" BOOLEAN NOT NULL DEFAULT false,
    "dataConsentAt" DATE,
    "memberId" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "students_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students_guardian_links" (
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "relation" "StudentGuardianRelation" NOT NULL,
    "isPayer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_guardian_links_pkey" PRIMARY KEY ("studentId","guardianId")
);

-- CreateIndex
CREATE UNIQUE INDEX "courses_teachers_userId_key" ON "courses_teachers"("userId");

-- CreateIndex
CREATE INDEX "courses_teachers_lastName_firstName_idx" ON "courses_teachers"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "courses_courses_code_key" ON "courses_courses"("code");

-- CreateIndex
CREATE INDEX "courses_courses_status_idx" ON "courses_courses"("status");

-- CreateIndex
CREATE INDEX "courses_courses_deletedAt_idx" ON "courses_courses"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "courses_courses_year_sequence_key" ON "courses_courses"("year", "sequence");

-- CreateIndex
CREATE INDEX "courses_course_teachers_teacherId_idx" ON "courses_course_teachers"("teacherId");

-- CreateIndex
CREATE INDEX "courses_sessions_courseId_date_idx" ON "courses_sessions"("courseId", "date");

-- CreateIndex
CREATE INDEX "courses_enrollments_studentId_idx" ON "courses_enrollments"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "courses_enrollments_courseId_studentId_key" ON "courses_enrollments"("courseId", "studentId");

-- CreateIndex
CREATE INDEX "courses_charges_enrollmentId_idx" ON "courses_charges"("enrollmentId");

-- CreateIndex
CREATE INDEX "courses_charges_status_dueDate_idx" ON "courses_charges"("status", "dueDate");

-- CreateIndex
CREATE INDEX "courses_payments_chargeId_idx" ON "courses_payments"("chargeId");

-- CreateIndex
CREATE INDEX "progress_attendance_courseId_idx" ON "progress_attendance"("courseId");

-- CreateIndex
CREATE INDEX "progress_attendance_enrollmentId_idx" ON "progress_attendance"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "progress_attendance_sessionId_enrollmentId_key" ON "progress_attendance"("sessionId", "enrollmentId");

-- CreateIndex
CREATE INDEX "progress_notes_enrollmentId_date_idx" ON "progress_notes"("enrollmentId", "date");

-- CreateIndex
CREATE INDEX "progress_assessments_courseId_date_idx" ON "progress_assessments"("courseId", "date");

-- CreateIndex
CREATE INDEX "progress_grades_enrollmentId_idx" ON "progress_grades"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "progress_grades_assessmentId_enrollmentId_key" ON "progress_grades"("assessmentId", "enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "students_guardians_debtorNumber_key" ON "students_guardians"("debtorNumber");

-- CreateIndex
CREATE INDEX "students_guardians_lastName_firstName_idx" ON "students_guardians"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "students_guardians_deletedAt_idx" ON "students_guardians"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "students_students_studentNumber_key" ON "students_students"("studentNumber");

-- CreateIndex
CREATE INDEX "students_students_lastName_firstName_idx" ON "students_students"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "students_students_status_idx" ON "students_students"("status");

-- CreateIndex
CREATE INDEX "students_students_deletedAt_idx" ON "students_students"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "students_students_year_sequence_key" ON "students_students"("year", "sequence");

-- CreateIndex
CREATE INDEX "students_guardian_links_guardianId_idx" ON "students_guardian_links"("guardianId");

-- AddForeignKey
ALTER TABLE "courses_course_teachers" ADD CONSTRAINT "courses_course_teachers_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses_course_teachers" ADD CONSTRAINT "courses_course_teachers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "courses_teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses_sessions" ADD CONSTRAINT "courses_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses_sessions" ADD CONSTRAINT "courses_sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "courses_teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses_enrollments" ADD CONSTRAINT "courses_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses_charges" ADD CONSTRAINT "courses_charges_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "courses_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses_payments" ADD CONSTRAINT "courses_payments_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "courses_charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_grades" ADD CONSTRAINT "progress_grades_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "progress_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students_guardian_links" ADD CONSTRAINT "students_guardian_links_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students_guardian_links" ADD CONSTRAINT "students_guardian_links_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "students_guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

