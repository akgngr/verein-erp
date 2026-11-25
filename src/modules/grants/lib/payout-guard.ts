/**
 * #582: "Alındı" tarihinin değişip değişemeyeceği (saf fonksiyon; servis `ActionError` fırlatır).
 * - Ödeme, isteği yapan hibeye ait olmalıdır (IDOR: başka hibenin kimliğiyle değiştirilemez).
 * - Alınmış ödemenin tarihi boşaltılamaz; aksi halde "alınmadı" yapılıp silinerek GoBD silme koruması
 *   atlatılabilirdi. Tarihin düzeltilmesi serbesttir.
 */
export function payoutReceivedChangeError(
  existing: { grantId: string; receivedAt: Date | null } | null,
  grantId: string,
  receivedAt: string | null,
): "grants.errors.notFound" | "grants.errors.payoutAlreadyReceived" | null {
  if (!existing || existing.grantId !== grantId) return "grants.errors.notFound";
  if (existing.receivedAt !== null && receivedAt === null) return "grants.errors.payoutAlreadyReceived";
  return null;
}
