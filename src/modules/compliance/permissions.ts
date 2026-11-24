import { definePermissions } from "@/shared/permissions/define";

/**
 * view: cockpit (each finding is additionally filtered by its metric provider's permission).
 * create: create a draft task from a finding. update: disable/enable a rule with a reason (audited).
 */
export const compliancePermissions = definePermissions("compliance", {
  ADMIN: ["view", "create", "update"],
  BOARD: ["view", "create"],
  SECRETARY: [],
  TREASURER: ["view", "create"],
  AUDITOR: ["view"],
  TAX_ADVISOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
