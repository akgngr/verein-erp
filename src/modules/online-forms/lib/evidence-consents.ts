/**
 * #580: Kanıt PDF'inde SEPA yetkisi gösterilir mi? Veli formlarında her zaman; üye formunda banka bilgisi
 * veya SEPA onayı varsa (önceden yalnızca veli formunda gösteriliyordu, üye yetkisi PDF'te eksik kalıyordu).
 */
export function showsSepaConsent(data: { member?: Record<string, unknown>; guardian?: Record<string, unknown> }): boolean {
  if (data.guardian) return true;
  const member = data.member;
  if (!member) return false;
  return member.sepaMandate === true || (typeof member.iban === "string" && member.iban.trim() !== "");
}
