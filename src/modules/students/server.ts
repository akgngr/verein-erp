import "server-only";

// students modülü — sunucu public girişi (kurslar modülü öğrenci ve ödeme sorumlusu bilgisini buradan alır)
export { studentsPermissions, studentsDatevPermissions } from "./permissions";
export { listStudentOptions, getStudentPayer } from "./queries/students";
export type { StudentOption, StudentPayer } from "./types";
