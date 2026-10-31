import "server-only";

import type { Role } from "@/shared/roles";

/**
 * T.C. kimlik no alanının role göre maskelenmesi.
 *
 * KARAR: VIEWER rolü tcKimlikNo alanını yanıtta HİÇ GÖREMEZ (null döner);
 * ADMIN/BOARD/SECRETARY tam değeri görür. Bu, "hassas alanlar yanıtta geçmez"
 * kuralının üyeler için tcKimlikNo özelinde genişletilmiş halidir.
 */
const FULL_ACCESS_ROLES: Role[] = ["ADMIN", "BOARD", "SECRETARY"];

export function canSeeTcKimlikNo(role: Role): boolean {
  return FULL_ACCESS_ROLES.includes(role);
}

/**VIEWER için null döndürür; diğer roller için değeri geçirir. */
export function maskTcKimlikNo(role: Role, value: string | null): string | null {
  return canSeeTcKimlikNo(role) ? value : null;
}
