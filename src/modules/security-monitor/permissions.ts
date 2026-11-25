import { definePermissions } from "@/shared/permissions/define";

export const securityMonitorPermissions = definePermissions("security-monitor", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: [],
  SECRETARY: [],
  TREASURER: [],
  AUDITOR: ["view"],
  TAX_ADVISOR: [],
  TEACHER: [],
  VIEWER: [],
});
