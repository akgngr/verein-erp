import { definePermissions } from "@/shared/permissions/define";

/** Eklentinin kendi ekranı yoktur; ayarlar Kampanyalar → Ayarlar'da (mailings.approve). */
export const campaignTelegramPermissions = definePermissions("campaign-telegram", {
  ADMIN: ["view"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: [],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
