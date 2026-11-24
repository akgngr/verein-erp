import { definePermissions } from "@/shared/permissions/define";

/** view: widget'ları görme (her widget ayrıca kendi requiredPermissions ve modül kapısıyla süzülür). */
export const widgetsPermissions = definePermissions("widgets", {
  ADMIN: ["view", "update"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TAX_ADVISOR: [],
  TEACHER: ["view"],
  VIEWER: ["view"],
});
