import { definePermissions } from "@/shared/permissions/define";

/** Faz 4 (4.1) yetki matrisi — accounting (fişler, raporlar, PDF'ler). */
export const accountingPermissions = definePermissions("accounting", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view"],
  SECRETARY: [],
  TREASURER: ["view", "create", "update", "delete", "approve"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});

/** Faz 4 (4.1) yetki matrisi — accountingSetup (hesaplar, kategoriler, projeler, ayarlar, bütçe). */
export const accountingSetupPermissions = definePermissions("accountingSetup", {
  ADMIN: ["view", "create", "update"],
  BOARD: ["view"],
  SECRETARY: [],
  TREASURER: ["view", "create", "update"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
