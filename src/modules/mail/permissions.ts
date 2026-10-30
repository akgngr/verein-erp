import { definePermissions } from "@/shared/permissions/define";

export const mailPermissions = definePermissions("mail", {
  ADMIN: ["view", "create", "update"],
  BOARD: [],
  SECRETARY: [],
  TREASURER: [],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
