import { definePermissions } from "@/shared/permissions/define";

export const securityMonitorPermissions = definePermissions("security-monitor", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view", "create"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  VIEWER: ["view"],
});

export default securityMonitorPermissions;
