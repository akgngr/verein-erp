import { definePermissions } from "@/shared/permissions/define";

export const tasksPermissions = definePermissions("tasks", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: ["view"],
});
