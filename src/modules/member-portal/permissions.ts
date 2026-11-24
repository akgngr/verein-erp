import { definePermissions } from "@/shared/permissions/define";

/**
 * Üye portalı yönetim izinleri (üyelerin kendi oturumu ayrı portal çerezinden gelir).
 */
export const memberPortalPermissions = definePermissions("member-portal", {
  ADMIN: ["view", "update"],
  BOARD: ["view"],
  SECRETARY: [],
  TREASURER: [],
  AUDITOR: [],
  TAX_ADVISOR: [],
  TEACHER: [],
  VIEWER: [],
});
