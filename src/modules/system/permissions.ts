import { definePermissions } from "@/shared/permissions/define";

export const systemPermissions = definePermissions("system", {
  ADMIN: ["view", "update", "delete"],
  BOARD: ["view"],
  SECRETARY: [],
  TREASURER: [],
  AUDITOR: [],
  VIEWER: [],
});

export const settingsPermissions = definePermissions("settings", {
  ADMIN: ["view"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  VIEWER: ["view"],
});
