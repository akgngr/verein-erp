import { definePermissions } from "@/shared/permissions/define";

/**
 * AI asistanını kullanabilecek roller. Asistanın göreceği veri ayrıca kullanıcının her modüldeki
 * kendi yetkisiyle ve yöneticinin modül erişim onayıyla sınırlıdır.
 */
export const aiPermissions = definePermissions("ai", {
  ADMIN: ["view", "update"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: [],
  TEACHER: [],
  VIEWER: [],
});
