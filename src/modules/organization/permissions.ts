import { definePermissions } from "@/shared/permissions/define";

/**
 * Faz 4 (4.1) yetki matrisi — organization (dernek ana verileri).
 * Silme yoktur; tek satırlık kayıttır. VIEWER düzenleyemez.
 */
export const organizationPermissions = definePermissions("organization", {
  ADMIN: ["view", "update"],
  BOARD: ["view", "update"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
