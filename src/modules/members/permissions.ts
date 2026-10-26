import { definePermissions } from "@/shared/permissions/define";

/** 7.3 yetki matrisi — members */
export const membersPermissions = definePermissions("members", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  VIEWER: ["view"],
});
