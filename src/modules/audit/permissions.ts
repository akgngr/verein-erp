import { definePermissions } from "@/shared/permissions/define";

/** 7.3 yetki matrisi — audit (yalnızca ADMIN, salt okunur) */
export const auditPermissions = definePermissions("audit", {
  ADMIN: ["view"],
  BOARD: [],
  SECRETARY: [],
  VIEWER: [],
});
