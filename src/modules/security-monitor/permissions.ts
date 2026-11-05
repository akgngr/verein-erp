import { definePermissions } from "@/shared/permissions/define";

export const securityMonitorPermissions = definePermissions("security-monitor", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: [],
  SECRETARY: [],
  TREASURER: [],
  AUDITOR: ["view"],
  VIEWER: [],
});

export default securityMonitorPermissions;
