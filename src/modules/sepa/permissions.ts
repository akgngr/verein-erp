import { definePermissions } from "@/shared/permissions/define";

/** SEPA-Lastschrift: tahsilat dosyası oluşturma ve tahsilatı kaydetme (yalnız mali yetkililer). */
export const sepaPermissions = definePermissions("sepa", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update"],
  SECRETARY: [],
  TREASURER: ["view", "create", "update", "delete"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
