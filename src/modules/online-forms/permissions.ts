import { definePermissions } from "@/shared/permissions/define";

/** Uzaktan form bağlantıları. Kayda yazma ayrıca kaynak modülün (üyeler/öğrenciler) güncelleme iznini ister. */
export const onlineFormsPermissions = definePermissions("online-forms", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: [],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
