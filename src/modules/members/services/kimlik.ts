import "server-only";

import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

import { memberIdentityPermissions } from "../permissions";

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

/** İzin: memberIdentity:view (varsayılan ADMIN, BOARD, SECRETARY; yönetici değiştirebilir). */
export function canSeeKimlikNo(role: Role): boolean {
  return can(role, memberIdentityPermissions, "view");
}

/** VIEWER için null döndürür; diğer roller için değeri geçirir. */
export function maskKimlikNo(role: Role, value: string | null): string | null {
  return canSeeKimlikNo(role) ? value : null;
}
