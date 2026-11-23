import { definePermissions } from "@/shared/permissions/define";

export const eventsPermissions = definePermissions("events", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update", "approve"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TAX_ADVISOR: [],
  TEACHER: [],
  VIEWER: ["view"],
})
