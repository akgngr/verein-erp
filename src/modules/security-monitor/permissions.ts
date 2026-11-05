import { definePermissions } from "@/shared/permissions/define";

export const securityMonitorPermissions = definePermissions("security-monitor", {
  ADMIN: ["view", "create", "update", "delete"],
  AUDITOR: ["view"],
});

export default securityMonitorPermissions;
