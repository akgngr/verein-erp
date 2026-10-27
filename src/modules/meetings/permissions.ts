import { definePermissions } from "@/shared/permissions/define";

/** 6. bölüm yetki matrisi — meetings (Faz 2: approve aksiyonu eklendi) */
export const meetingsPermissions = definePermissions("meetings", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update", "approve"],
  SECRETARY: ["view", "create", "update"],
  VIEWER: ["view"],
});
