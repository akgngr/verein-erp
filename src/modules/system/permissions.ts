import { definePermissions } from "@/shared/permissions/define";

export const systemPermissions = definePermissions("system", {
  ADMIN: ["view", "update", "delete"],
  BOARD: ["view"],
  SECRETARY: [],
  TREASURER: [],
  AUDITOR: [],
  TAX_ADVISOR: [],
  TEACHER: [],
  VIEWER: [],
});

export const settingsPermissions = definePermissions("settings", {
  ADMIN: ["view"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TAX_ADVISOR: [],
  TEACHER: ["view"], // yalnızca kişisel tercihler (dil, tema); diğer ayar sayfaları kendi yetkisiyle süzülür
  VIEWER: ["view"],
});
