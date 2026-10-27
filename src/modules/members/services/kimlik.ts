import "server-only";

import type { Role } from "@prisma/client";

/**
 * Kimlik no alanının role göre maskelenmesi.
 *
 * KARAR (Verein pivotu): tcKimlikNo alanı "kimlikNo" olarak serbest metne
 * çevrildi (Mitgliedsnummer/Steuer-ID/ehliyet/uyruk/pasaport no). Yine de
 * VIEWER rolü yanıtta HİÇ GÖREMEZ (null döner); ADMIN/BOARD/SECRETARY tam
 * değeri görür. Bu, "hassas alanlar yanıtta geçmez" kuralının üyeler için
 * kimlikNo özelinde genişletilmiş halidir.
 *
 * KARAR (Faz 4): TREASURER/AUDITOR üyelerde salt okunur ve mali veri minimalizmi
 * (DSGVO) gereği kimlikNo'yu GÖREMEZ (maskeleme genişletildi); VIEWER'da önceki
 * gibi null döner.
 */
const FULL_ACCESS_ROLES: Role[] = ["ADMIN", "BOARD", "SECRETARY"];

export function canSeeKimlikNo(role: Role): boolean {
  return FULL_ACCESS_ROLES.includes(role);
}

/** VIEWER için null döndürür; diğer roller için değeri geçirir. */
export function maskKimlikNo(role: Role, value: string | null): string | null {
  return canSeeKimlikNo(role) ? value : null;
}
