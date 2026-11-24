import { definePermissions } from "@/shared/permissions/define";

export const financePermissions = definePermissions("finance", {
  ADMIN: ["view", "approve"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view", "approve"],
  AUDITOR: ["view"],
  TAX_ADVISOR: ["view"],
  TEACHER: ["view"],
  VIEWER: ["view"],
});
