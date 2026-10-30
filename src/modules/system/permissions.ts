import { definePermissions } from "@/shared/permissions/define";

export const systemPermissions = definePermissions("system", {
  ADMIN: ["view", "update", "delete"],
  BOARD: ["view"],
  SECRETARY: [],
  TREASURER: [],
  AUDITOR: [],
  TEACHER: [],
  VIEWER: [],
});

export const settingsPermissions = definePermissions("settings", {
  ADMIN: ["view"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: ["view"], // yalnızca kişisel tercihler (dil, tema); diğer ayar sayfaları kendi yetkisiyle süzülür
  VIEWER: ["view"],
});
