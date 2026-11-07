import { definePermissions } from "@/shared/permissions/define";

/**
 * Kampanyalar: gönderim (create), geçmiş (view), kanal ayarları (approve). Ayrıca her alıcı kaynağı kendi iznini ister
 * (ör. üye listesi için üyeleri görme yetkisi); kullanıcı yalnızca yetkili olduğu kaynakları görür.
 */
export const mailingsPermissions = definePermissions("mailings", {
  ADMIN: ["view", "create", "approve"],
  BOARD: ["view", "create", "approve"],
  SECRETARY: ["view", "create"],
  TREASURER: [],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
