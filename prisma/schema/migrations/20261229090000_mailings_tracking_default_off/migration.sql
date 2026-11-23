-- Gizlilik varsayılanı (DSGVO Art. 25): yeni kampanyalarda açılma/tıklama izleme kapalı başlar.
-- Mevcut kampanyaların değeri değişmez.
ALTER TABLE "mailings_campaigns" ALTER COLUMN "tracking" SET DEFAULT false;
