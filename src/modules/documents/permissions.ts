import { definePermissions } from "@/shared/permissions/define";

/** 7.3 yetki matrisi — documents */
export const documentsPermissions = definePermissions("documents", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  VIEWER: ["view"],
});
