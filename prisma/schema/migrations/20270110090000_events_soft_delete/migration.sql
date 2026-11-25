-- #584: Etkinlikler yumuşak silinir (kayıt ve katılımcılar denetim için korunur).
ALTER TABLE "events_items" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "events_items" ADD COLUMN "deletedById" TEXT;

CREATE INDEX "events_items_deletedAt_idx" ON "events_items"("deletedAt");
