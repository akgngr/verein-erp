import "server-only";

import { getDb } from "@/shared/db";

/** Envanterden gelen elden çıkarmayı işaretleyen not (geri alınabilir olduğunu ayırt etmek için). */
export const INVENTORY_DISPOSAL_NOTE = "Inventar: ausgemustert";

const GWG_LIMIT_CENTS = 80_000;

/**
 * Envanter eşyasından demirbaş (AfA) kaydı oluşturur/günceller. Ad, alış tarihi ve bedel envanterden
 * gelir; AfA yöntemi ve faydalı ömür muhasebede kalır (yeni kayıtta: ≤ 800 € GWG, aksi 36 ay doğrusal).
 * Envanterde "hurdaya çıkarıldı" → elden çıkarma; geri alınırsa (yalnızca envanterden gelen) çıkarma kaldırılır.
 * Karşı modülü geri çağırmaz (döngü yok).
 */
export async function saveAssetForInventoryItem(input: { inventoryItemId: string; name: string; acquisitionDate: Date; costCents: number; scrapped: boolean }): Promise<string> {
  const db = getDb();
  const existing = await db.accountingAsset.findUnique({ where: { inventoryItemId: input.inventoryItemId } });
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  if (!existing) {
    const gwg = input.costCents <= GWG_LIMIT_CENTS;
    const created = await db.accountingAsset.create({
      data: {
        inventoryItemId: input.inventoryItemId,
        name: input.name.slice(0, 150),
        acquisitionDate: input.acquisitionDate,
        costCents: input.costCents,
        method: gwg ? "GWG" : "LINEAR",
        usefulLifeMonths: gwg ? 1 : 36,
        ...(input.scrapped ? { disposalDate: today, disposalNote: INVENTORY_DISPOSAL_NOTE } : {}),
      },
      select: { id: true },
    });
    return created.id;
  }
  const methodFix = existing.method === "GWG" && input.costCents > GWG_LIMIT_CENTS ? { method: "LINEAR", usefulLifeMonths: 36 } : {};
  const disposal = input.scrapped
    ? existing.disposalDate
      ? {}
      : { disposalDate: today, disposalNote: INVENTORY_DISPOSAL_NOTE }
    : existing.disposalNote === INVENTORY_DISPOSAL_NOTE
      ? { disposalDate: null, disposalNote: null }
      : {};
  await db.accountingAsset.update({
    where: { id: existing.id },
    data: { name: input.name.slice(0, 150), acquisitionDate: input.acquisitionDate, costCents: input.costCents, ...methodFix, ...disposal },
  });
  return existing.id;
}

/**
 * Envanter bağlantısını kaldırır. deleted=true (eşya silindi) ise henüz çıkarılmamış demirbaş bugünden
 * elden çıkarılır; AfA geçmişi muhasebede kalır (GoBD).
 */
export async function unlinkAssetFromInventoryItem(inventoryItemId: string, deleted: boolean): Promise<void> {
  const db = getDb();
  const asset = await db.accountingAsset.findUnique({ where: { inventoryItemId } });
  if (!asset) return;
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  await db.accountingAsset.update({
    where: { id: asset.id },
    data: { inventoryItemId: null, ...(deleted && !asset.disposalDate ? { disposalDate: today, disposalNote: INVENTORY_DISPOSAL_NOTE } : {}) },
  });
}

export async function linkAssetToInventoryItem(assetId: string, inventoryItemId: string): Promise<void> {
  await getDb().accountingAsset.update({ where: { id: assetId }, data: { inventoryItemId } });
}
