-- Logo (kullanıcı isteği): PDF antetinde kullanılan dernek logosu.
-- KARAR: Yalnızca PNG/JPG kabul edilir (uygulama katmanında magic byte ile
-- doğrulanır); dosya UPLOAD_DIR/organization/ altında uuid adla saklanır ve
-- yalnızca göreli yolu (logoPath) veritabanında tutulur.
ALTER TABLE "OrganizationProfile" ADD COLUMN "logoPath" TEXT;
ALTER TABLE "OrganizationProfile" ADD COLUMN "logoMime" TEXT;
ALTER TABLE "OrganizationProfile" ADD COLUMN "logoOriginalName" TEXT;
ALTER TABLE "OrganizationProfile" ADD COLUMN "logoUpdatedAt" TIMESTAMP(3);
