import { definePermissions } from "@/shared/permissions/define";

/** Herkes yalnızca KENDİ dosyalarını görür ve siler (sorgu kapsamı sahibe bağlıdır). */
export const exportsPermissions = definePermissions("exports", {
  ADMIN: ["view", "create", "delete"],
  BOARD: ["view", "create", "delete"],
  SECRETARY: ["view", "create", "delete"],
  TREASURER: ["view", "create", "delete"],
  AUDITOR: ["view", "create", "delete"],
  TEACHER: ["view", "create", "delete"],
  VIEWER: ["view", "create", "delete"],
});
