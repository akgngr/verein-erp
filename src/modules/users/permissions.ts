import { definePermissions } from "@/shared/permissions/define";

/** 7.3 yetki matrisi — users (yalnızca ADMIN) */
export const usersPermissions = definePermissions("users", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: [],
  SECRETARY: [],
  VIEWER: [],
  TREASURER: [],
  AUDITOR: [],
  TEACHER: [],
});
