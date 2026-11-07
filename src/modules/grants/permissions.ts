import { definePermissions } from "@/shared/permissions/define";

/** Hibeler ve Verwendungsnachweis. Fiş ayrıntıları muhasebe verisidir; görüntüleme yönetim/hazine rolleriyle sınırlı. */
export const grantsPermissions = definePermissions("grants", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update", "delete"],
  SECRETARY: ["view"],
  TREASURER: ["view", "create", "update", "delete"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
