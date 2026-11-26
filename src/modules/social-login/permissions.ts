import { definePermissions } from "@/shared/permissions/define";

export const socialLoginPermissions = definePermissions("socialLogin", {
  ADMIN: ["view", "update"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  VIEWER: ["view"],
  TEACHER: ["view"],
  TAX_ADVISOR: [],
});
