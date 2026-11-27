import "server-only";

// students modülü — sunucu public girişi (kurslar modülü öğrenci ve ödeme sorumlusu bilgisini buradan alır)
export { studentsPermissions, studentsDatevPermissions } from "./permissions";
export { listStudentOptions, getStudentPayer } from "./queries/students";
export { listGuardianOptions, listGuardianContactsForStudents, type GuardianContactRecord } from "./queries/guardians";
export type { StudentOption, StudentPayer } from "./types";
export { getStudentStats } from "./queries/stats";
export { getStudentSelfService, applyStudentSelfService, getGuardianSelfService, applyGuardianSelfService, getGuardianMandates, getGuardianIdsByDebtorNumber } from "./services/online-form";
export type { StudentSelfService, StudentSelfServiceInput, GuardianSelfService, GuardianSelfServiceInput } from "./services/online-form";
