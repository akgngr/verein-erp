import { definePermissions } from "@/shared/permissions/define";

export const automationPermissions = definePermissions("automation", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: ["view"],
});
