import { definePermissions } from "@/shared/permissions/define";

/**
 * view: kendi sekreter özetini ve önerilerini görür (veri, her modülün kendi yetkisiyle süzülür).
 * update: sekreter ayarlarını kurum düzeyinde yönetir (özellik bayrakları, varsayılan özet saati).
 */
export const secretaryPermissions = definePermissions("secretary", {
  ADMIN: ["view", "update"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: ["view"],
  VIEWER: [],
});
