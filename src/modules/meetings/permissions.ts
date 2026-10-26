import { definePermissions } from "@/shared/permissions/define";

/** 7.3 yetki matrisi — meetings */
export const meetingsPermissions = definePermissions("meetings", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  VIEWER: ["view"],
});
