/**
 * #582: Envanter eşyasının muhasebedeki demirbaş (AfA) karşılığı (saf fonksiyon). `syncItemToAccounting`
 * yalnız "AfA'da izle" işaretli, alış tarihi ve bedeli olan eşyayı senkron tutar; aynı kural burada.
 * İki durumun izdüşümü farklıysa işlem muhasebe kaydını oluşturur, değiştirir veya elden çıkarır.
 */
export type AssetRelevantFields = {
  name: string;
  purchaseDate: Date | null;
  purchasePrice: { toString(): string } | number | null;
  trackAsAsset: boolean;
  status: string;
};

export function assetProjection(item: AssetRelevantFields | null): string | null {
  if (!item) return null;
  const costCents = item.purchasePrice ? Math.round(Number(item.purchasePrice) * 100) : 0;
  if (!item.trackAsAsset || !item.purchaseDate || costCents <= 0) return null;
  return JSON.stringify([item.name.slice(0, 150), item.purchaseDate.toISOString().slice(0, 10), costCents, item.status === "SCRAPPED"]);
}

export function changesAccountingAsset(before: AssetRelevantFields | null, after: AssetRelevantFields | null): boolean {
  return assetProjection(before) !== assetProjection(after);
}
