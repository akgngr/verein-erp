import { definePermissions } from "@/shared/permissions/define";

/**
 * Takvim. Kişisel takvimi herkes yalnız kendisi görür ve düzenler (view yeterli);
 * ortak takvimlere kayıt eklemek create/update, ortak takvim yönetmek approve ister.
 */
export const calendarPermissions = definePermissions("calendar", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update", "delete", "approve"],
  SECRETARY: ["view", "create", "update", "delete"],
  TREASURER: ["view", "create", "update"],
  AUDITOR: ["view"],
  TEACHER: ["view", "create", "update"],
  VIEWER: ["view"],
});
