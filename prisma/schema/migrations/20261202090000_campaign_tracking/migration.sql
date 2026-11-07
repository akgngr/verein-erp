-- AlterTable
ALTER TABLE "mailings_campaigns" ADD COLUMN     "tracking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "trackingBaseUrl" TEXT;

-- AlterTable
ALTER TABLE "mailings_deliveries" ADD COLUMN     "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "error" TEXT,
ADD COLUMN     "firstClickAt" TIMESTAMP(3),
ADD COLUMN     "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'QUEUED',
ADD COLUMN     "token" TEXT;

-- Mevcut kayıtlar başarılı gönderimlerdir (eski şema yalnız başarılıları yazıyordu); belirteç üretilir.
UPDATE "mailings_deliveries" SET "status" = 'SENT', "sentAt" = "createdAt", "token" = md5(random()::text || "id" || clock_timestamp()::text) WHERE "token" IS NULL;
ALTER TABLE "mailings_deliveries" ALTER COLUMN "token" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "mailings_deliveries_token_key" ON "mailings_deliveries"("token");

-- CreateIndex
CREATE INDEX "mailings_deliveries_providerId_idx" ON "mailings_deliveries"("providerId");

