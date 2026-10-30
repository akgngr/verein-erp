import { definePermissions } from "@/shared/permissions/define";

/** 6. bölüm yetki matrisi — documents */
export const documentsPermissions = definePermissions("documents", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  VIEWER: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: [],
});

/** 6. bölüm yetki matrisi — documentCategories (silme yoktur; pasife alma = update) */
export const documentCategoriesPermissions = definePermissions("documentCategories", {
  ADMIN: ["view", "create", "update"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view"],
  VIEWER: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: [],
});
