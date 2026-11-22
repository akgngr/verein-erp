import { definePermissions } from "@/shared/permissions/define";

/** view: widget'ları görme (her widget ayrıca kendi requiredPermissions ve modül kapısıyla süzülür). */
export const widgetsPermissions = definePermissions("widgets", {
  ADMIN: ["view", "update"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: ["view"],
  VIEWER: ["view"],
});
