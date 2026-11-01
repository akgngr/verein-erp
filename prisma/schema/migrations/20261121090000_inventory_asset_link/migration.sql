-- AlterTable
ALTER TABLE "AccountingAsset" ADD COLUMN     "inventoryItemId" TEXT;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "trackAsAsset" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAsset_inventoryItemId_key" ON "AccountingAsset"("inventoryItemId");

