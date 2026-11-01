import "server-only";

import { unlinkAssetFromInventoryItem, saveAssetForInventoryItem } from "@/modules/accounting/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { getDb } from "@/shared/db";

export async function isAccountingUsable(): Promise<boolean> {
  return (await listUsableModuleKeys()).includes("accounting");
}

/**
 * Envanter eşyası → muhasebe demirbaşı. Muhasebe kapalıysa hiçbir şey yapılmaz. "AfA'da izle"
 * işaretli, alış tarihi ve bedeli olan eşya senkron tutulur; işaret kaldırılırsa bağlantı çözülür.
 * Hata envanter işlemini bozmaz (loglanır).
 */
export async function syncItemToAccounting(itemId: string, options: { deleted?: boolean } = {}): Promise<void> {
  try {
    if (!(await isAccountingUsable())) return;
    if (options.deleted) {
      await unlinkAssetFromInventoryItem(itemId, true);
      return;
    }
    const item = await getDb().inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return;
    const costCents = item.purchasePrice ? Math.round(Number(item.purchasePrice) * 100) : 0;
    if (item.trackAsAsset && item.purchaseDate && costCents > 0) {
      await saveAssetForInventoryItem({ inventoryItemId: item.id, name: item.name, acquisitionDate: item.purchaseDate, costCents, scrapped: item.status === "SCRAPPED" });
    } else {
      await unlinkAssetFromInventoryItem(item.id, false);
    }
  } catch (error) {
    console.error("[inventory] asset sync failed:", error instanceof Error ? error.message : error);
  }
}

/** Muhasebe → envanter: demirbaştan eşya oluşturur/günceller (muhasebe modülü çağırır; geri çağrı yok). */
export async function saveItemForAsset(input: { inventoryItemId: string | null; name: string; purchaseDate: Date; costCents: number; disposed: boolean }): Promise<string> {
  const db = getDb();
  const data = {
    name: input.name.slice(0, 200),
    purchaseDate: input.purchaseDate,
    purchasePrice: input.costCents / 100,
    trackAsAsset: true,
    ...(input.disposed ? { status: "SCRAPPED" } : {}),
  };
  if (input.inventoryItemId) {
    const existing = await db.inventoryItem.findUnique({ where: { id: input.inventoryItemId }, select: { id: true, status: true } });
    if (existing) {
      await db.inventoryItem.update({ where: { id: existing.id }, data: { ...data, ...(input.disposed ? {} : existing.status === "SCRAPPED" ? {} : {}) } });
      return existing.id;
    }
  }
  const created = await db.inventoryItem.create({ data: { ...data, status: input.disposed ? "SCRAPPED" : "IN_USE", category: "OTHER", quantity: 1 }, select: { id: true } });
  return created.id;
}

export async function markItemScrapped(itemId: string): Promise<void> {
  await getDb().inventoryItem.updateMany({ where: { id: itemId }, data: { status: "SCRAPPED" } });
}
