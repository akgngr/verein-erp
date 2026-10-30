import { definePermissions } from "@/shared/permissions/define";

/** Öğrenci ve veli kayıtları. Öğretmen bu modülü görmez (öğrenci adı kurs kaydında anlık görüntüdür). */
export const studentsPermissions = definePermissions("students", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});

/** DATEV ayarları ve Debitoren dışa aktarımı. */
export const studentsDatevPermissions = definePermissions("studentsDatev", {
  ADMIN: ["view", "update"],
  BOARD: ["view"],
  SECRETARY: [],
  TREASURER: ["view", "update"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
