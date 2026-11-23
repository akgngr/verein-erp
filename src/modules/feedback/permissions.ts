import { definePermissions } from "@/shared/permissions/define";

/**
 * Geri bildirim (hata/öneri): herkes kendi kaydını oluşturur ve görür (view/create);
 * "approve" tüm kayıtları yönetir (durum, öncelik, cevap, ekran görüntüsü).
 */
export const feedbackPermissions = definePermissions("feedback", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create"],
  SECRETARY: ["view", "create"],
  TREASURER: ["view", "create"],
  AUDITOR: ["view", "create"],
  TAX_ADVISOR: [],
  TEACHER: ["view", "create"],
  VIEWER: ["view", "create"],
});
