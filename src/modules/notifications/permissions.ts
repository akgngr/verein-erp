import { definePermissions } from "@/shared/permissions/define";

/**
 * view: kendi bildirimlerini görür ve tercihlerini yönetir (her rol; içerik her bildirim türünün kendi yetkisiyle süzülür).
 * update: kurum düzeyinde kanal ayarları ve sağlayıcı sırları (DB'de şifreli).
 */
export const notificationsPermissions = definePermissions("notifications", {
  ADMIN: ["view", "update"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TAX_ADVISOR: [],
  TEACHER: ["view"],
  VIEWER: ["view"],
});
