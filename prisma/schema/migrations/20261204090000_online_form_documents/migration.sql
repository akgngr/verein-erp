-- CreateEnum
CREATE TYPE "OnlineFormDocumentPurpose" AS ENUM ('PRIVACY', 'PHOTO', 'OTHER');


-- CreateTable
CREATE TABLE "online_form_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" "OnlineFormDocumentPurpose" NOT NULL DEFAULT 'OTHER',
    "contentHtml" TEXT NOT NULL,
    "requiresConsent" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "appliesTo" "OnlineFormKind"[] DEFAULT ARRAY['MEMBER', 'STUDENT', 'GUARDIAN']::"OnlineFormKind"[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_form_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "online_form_documents_active_sortOrder_idx" ON "online_form_documents"("active", "sortOrder");


-- Veri taşıma: eski iki sabit metin (online_form_settings) belgeye dönüştürülür. Satır sonları paragraf olur.
INSERT INTO "online_form_documents" ("id", "title", "purpose", "contentHtml", "requiresConsent", "required", "sortOrder", "updatedAt")
SELECT 'privacy-migrated', 'Datenschutzhinweise', 'PRIVACY',
       '<p>' || replace(replace(replace(replace("privacyText", '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), E'\n', '</p><p>') || '</p>',
       true, true, 0, CURRENT_TIMESTAMP
FROM "online_form_settings" WHERE "id" = 'default' AND coalesce(trim("privacyText"), '') <> '';
INSERT INTO "online_form_documents" ("id", "title", "purpose", "contentHtml", "requiresConsent", "required", "appliesTo", "sortOrder", "updatedAt")
SELECT 'photo-migrated', 'Einwilligung Foto/Video', 'PHOTO',
       '<p>' || replace(replace(replace(replace("photoText", '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), E'\n', '</p><p>') || '</p>',
       true, false, ARRAY['MEMBER', 'STUDENT']::"OnlineFormKind"[], 1, CURRENT_TIMESTAMP
FROM "online_form_settings" WHERE "id" = 'default' AND coalesce(trim("photoText"), '') <> '';

-- Eski ayar tablosu (taşındıktan sonra)
DROP TABLE "online_form_settings";
