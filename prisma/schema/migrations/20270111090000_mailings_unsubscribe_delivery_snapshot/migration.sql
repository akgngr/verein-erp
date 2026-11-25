-- #581: Tek tıkla abonelikten çıkış (alıcı kaydı) ve worker üzerinden programatik gönderim (ad/değişken anlık görüntüsü).
-- AlterTable
ALTER TABLE "mailings_deliveries" ADD COLUMN     "recipientKey" TEXT,
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "vars" JSONB;

-- CreateIndex
CREATE INDEX "mail_logs_module_reference_idx" ON "mail_logs"("module", "reference");
