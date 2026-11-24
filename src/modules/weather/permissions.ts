import { definePermissions } from "@/shared/permissions/define";

export const weatherPermissions = definePermissions("weather", {
  ADMIN: ["view", "approve"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TAX_ADVISOR: [],
  TEACHER: ["view"],
  VIEWER: ["view"],
});
