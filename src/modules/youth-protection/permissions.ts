import { definePermissions } from "@/shared/permissions/define";

export const youthProtectionPermissions = definePermissions("youth-protection", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update", "delete"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: [],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
