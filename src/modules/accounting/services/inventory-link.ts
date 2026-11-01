import "server-only";

import { markItemScrapped, saveItemForAsset } from "@/modules/inventory/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { getDb } from "@/shared/db";

import { linkAssetToInventoryItem } from "./inventory-assets";

export async function isInventoryUsable(): Promise<boolean> {
  return (await listUsableModuleKeys()).includes("inventory");
}

/**
 * Muhasebe demirbaşı → envanter eşyası (envanter modülü etkinse). Ad, tarih ve bedel envantere
 * yazılır; elden çıkarılan demirbaş envanterde "hurdaya çıkarıldı" olur. Hata muhasebe işlemini bozmaz.
 */
export async function syncAssetToInventory(assetId: string): Promise<void> {
  try {
    if (!(await isInventoryUsable())) return;
    const asset = await getDb().accountingAsset.findUnique({ where: { id: assetId } });
    if (!asset) return;
    if (asset.inventoryItemId && asset.disposalDate) {
      await markItemScrapped(asset.inventoryItemId);
    }
    const itemId = await saveItemForAsset({
      inventoryItemId: asset.inventoryItemId,
      name: asset.name,
      purchaseDate: asset.acquisitionDate,
      costCents: asset.costCents,
      disposed: Boolean(asset.disposalDate),
    });
    if (itemId !== asset.inventoryItemId) await linkAssetToInventoryItem(asset.id, itemId);
  } catch (error) {
    console.error("[accounting] inventory sync failed:", error instanceof Error ? error.message : error);
  }
}

/** Bağlantısız tüm demirbaşları envantere ekler. */
export async function linkAllAssetsToInventory(): Promise<number> {
  if (!(await isInventoryUsable())) return 0;
  const assets = await getDb().accountingAsset.findMany({ where: { inventoryItemId: null }, select: { id: true } });
  for (const asset of assets) await syncAssetToInventory(asset.id);
  return assets.length;
}
