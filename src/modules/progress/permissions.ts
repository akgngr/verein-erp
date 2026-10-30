import { definePermissions } from "@/shared/permissions/define";

/** Yoklama, notlar ve gelişim kayıtları. Öğretmen yalnızca kendi kurslarında (sorgu kapsamı). */
export const progressPermissions = definePermissions("progress", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: [],
  AUDITOR: [],
  TEACHER: ["view", "create", "update", "delete"],
  VIEWER: [],
});
