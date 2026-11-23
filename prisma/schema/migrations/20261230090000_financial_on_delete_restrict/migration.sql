-- GoBD / AO § 147 compliance (#496): prevent cascading hard-deletes on financial records

-- DropForeignKey
ALTER TABLE "courses_enrollments" DROP CONSTRAINT "courses_enrollments_courseId_fkey";

-- DropForeignKey
ALTER TABLE "courses_charges" DROP CONSTRAINT "courses_charges_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "courses_payments" DROP CONSTRAINT "courses_payments_chargeId_fkey";

-- DropForeignKey
ALTER TABLE "grant_budget_lines" DROP CONSTRAINT "grant_budget_lines_grantId_fkey";

-- DropForeignKey
ALTER TABLE "grant_payouts" DROP CONSTRAINT "grant_payouts_grantId_fkey";

-- DropForeignKey
ALTER TABLE "AccountingBankTransaction" DROP CONSTRAINT "AccountingBankTransaction_importId_fkey";

-- DropForeignKey
ALTER TABLE "sepa_debit_items" DROP CONSTRAINT "sepa_debit_items_runId_fkey";

-- DropForeignKey
ALTER TABLE "MemberDue" DROP CONSTRAINT "MemberDue_memberId_fkey";

-- AddForeignKey
ALTER TABLE "courses_enrollments" ADD CONSTRAINT "courses_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses_charges" ADD CONSTRAINT "courses_charges_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "courses_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses_payments" ADD CONSTRAINT "courses_payments_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "courses_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_budget_lines" ADD CONSTRAINT "grant_budget_lines_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_payouts" ADD CONSTRAINT "grant_payouts_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingBankTransaction" ADD CONSTRAINT "AccountingBankTransaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "AccountingBankImport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sepa_debit_items" ADD CONSTRAINT "sepa_debit_items_runId_fkey" FOREIGN KEY ("runId") REFERENCES "sepa_debit_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberDue" ADD CONSTRAINT "MemberDue_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
