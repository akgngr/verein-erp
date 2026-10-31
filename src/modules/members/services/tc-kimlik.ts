import "server-only";

import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

import { memberIdentityPermissions } from "../permissions";

/**
 * T.C. kimlik no alanının role göre maskelenmesi.
 *
 * KARAR: VIEWER rolü tcKimlikNo alanını yanıtta HİÇ GÖREMEZ (null döner);
 * ADMIN/BOARD/SECRETARY tam değeri görür. Bu, "hassas alanlar yanıtta geçmez"
 * kuralının üyeler için tcKimlikNo özelinde genişletilmiş halidir.
 */

/** İzin: memberIdentity:view (varsayılan ADMIN, BOARD, SECRETARY; yönetici değiştirebilir). */
export function canSeeTcKimlikNo(role: Role): boolean {
  return can(role, memberIdentityPermissions, "view");
}

/**VIEWER için null döndürür; diğer roller için değeri geçirir. */
export function maskTcKimlikNo(role: Role, value: string | null): string | null {
  return canSeeTcKimlikNo(role) ? value : null;
}
