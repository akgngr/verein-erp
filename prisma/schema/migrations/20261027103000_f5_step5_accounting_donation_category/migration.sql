-- Faz 5 Adım 5 (§ 6): bağış kategorisi ayarı.
ALTER TABLE "AccountingSettings" ADD COLUMN "donationCategoryId" TEXT;

-- Seed eki (idempotent): ayar satırı varsa ve alan boşsa "Bağışlar (Spenden)" kategorisi bağlanır.
UPDATE "AccountingSettings"
SET "donationCategoryId" = (SELECT id FROM "AccountingCategory" WHERE name = 'Bağışlar (Spenden)')
WHERE id = 'singleton' AND "donationCategoryId" IS NULL
  AND EXISTS (SELECT 1 FROM "AccountingCategory" WHERE name = 'Bağışlar (Spenden)');
