/**
 * KARAR (#582): `CrmDeal.amountCents` PostgreSQL `integer` (en çok 2.147.483.647 sent ≈ 21,47 milyon €).
 * Tek fırsat tutarı bu sınırla doğrulanır; dernek CRM'inde daha büyük tutar beklenmez, BigInt göçü (istemci
 * ve AI istatistikleri dahil) gerekmez. Aşama toplamları veritabanında bigint olarak hesaplanır.
 * İstemci formu ve sunucu eylemi aynı sabiti kullanır.
 */
export const MAX_DEAL_AMOUNT = 20_000_000;
