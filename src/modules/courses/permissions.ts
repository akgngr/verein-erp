import { definePermissions } from "@/shared/permissions/define";

/** Kurslar ve kurs kayıtları. Öğretmen yalnızca kendi kurslarını görür (sorgularda süzülür). */
export const coursesPermissions = definePermissions("courses", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: ["view"],
  VIEWER: [],
});

/** Ders oturumları (tarih/konu). Öğretmen kendi kurslarında yönetir. */
export const courseSessionsPermissions = definePermissions("courseSessions", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view", "create", "update", "delete"],
  SECRETARY: ["view", "create", "update", "delete"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: ["view", "create", "update", "delete"],
  VIEWER: [],
});

/** Kurs ücretleri, tahsilatlar ve muhasebe aktarımı. Öğretmen göremez. */
export const courseFeesPermissions = definePermissions("courseFees", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view"],
  SECRETARY: ["view", "create"],
  TREASURER: ["view", "create", "update", "delete"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});

/** Öğretmen kayıtları ve davet. */
export const courseTeachersPermissions = definePermissions("courseTeachers", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});

/**
 * Kapsam: tüm kursları görme. Kapalıysa kullanıcı yalnızca öğretmeni olduğu kursları (ve onların
 * derslerini, öğrenci takibini) görür. Varsayılan: öğretmen hariç herkes.
 */
export const coursesAllPermissions = definePermissions("coursesAll", {
  ADMIN: ["view"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: ["view"],
});
