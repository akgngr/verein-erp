import { definePermissions } from "@/shared/permissions/define";

/** Demo veri: yalnızca yönetici yükler/siler. */
export const demoPermissions = definePermissions("demo", {
  ADMIN: ["view", "create", "delete"],
  BOARD: [],
  SECRETARY: [],
  TREASURER: [],
  AUDITOR: [],
  TEACHER: [],
  VIEWER: [],
});
