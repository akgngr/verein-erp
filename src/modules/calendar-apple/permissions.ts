import { definePermissions } from "@/shared/permissions/define";

/**
 * Eklentinin kendi ekranı yoktur; bağlantıyı her kullanıcı Takvim ayarlarından kendisi kurar
 * (calendar.view). Bu tanım yalnız modül standardı ve yetki matrisinde görünmesi içindir.
 */
export const calendarApplePermissions = definePermissions("calendar-apple", {
  ADMIN: ["view"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: ["view"],
  VIEWER: ["view"],
});
