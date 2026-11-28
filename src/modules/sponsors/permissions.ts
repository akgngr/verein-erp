import { definePermissions } from "@/shared/permissions/define";

export const sponsorsPermissions = definePermissions("sponsors", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update", "delete"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view", "create", "update"],
  AUDITOR: ["view"],
  TAX_ADVISOR: ["view"],
  TEACHER: [],
  VIEWER: ["view"],
});
