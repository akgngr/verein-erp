-- B001 Q2 (#406): SEPA iade koçu. Yalnız ekleme; mevcut kayıtlar değişmez.
-- AlterTable
ALTER TABLE "sepa_debit_items" ADD COLUMN     "returnCode" TEXT,
ADD COLUMN     "returnFeeCents" INTEGER,
ADD COLUMN     "returnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "sepa_debit_items_mandateReference_status_idx" ON "sepa_debit_items"("mandateReference", "status");
