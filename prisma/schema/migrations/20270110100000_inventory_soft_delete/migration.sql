-- #582: Envanter eşyası yumuşak silme (denetim ve AfA izlenebilirliği).
-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "inventory_items_deletedAt_idx" ON "inventory_items"("deletedAt");
