import { definePermissions } from "@/shared/permissions/define";

/**
 * Toplu e-posta: gönderim (create) ve geçmiş (view). Ayrıca her alıcı kaynağı kendi iznini ister
 * (ör. üye listesi için üyeleri görme yetkisi); kullanıcı yalnızca yetkili olduğu kaynakları görür.
 */
export const mailingsPermissions = definePermissions("mailings", {
  ADMIN: ["view", "create"],
  BOARD: ["view", "create"],
  SECRETARY: ["view", "create"],
  TREASURER: [],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
