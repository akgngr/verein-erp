import { definePermissions } from "@/shared/permissions/define";

/** 7.3 yetki matrisi — members */
export const membersPermissions = definePermissions("members", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  VIEWER: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: [],
});

/**
 * Aidat/ödeme yetkileri (Faz 4, 4.6 — KARAR): VIEWER ödeme verisi göremez;
 * TREASURER (sayman) ödemeleri kaydeder ve görüntüler; AUDITOR yalnız okur.
 * Void (iptal) yalnız ADMIN'dir ("delete").
 */
export const memberPaymentsPermissions = definePermissions("memberPayments", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  VIEWER: [],
  TREASURER: ["view", "create", "update"],
  AUDITOR: ["view"],
  TEACHER: [],
});

/** Üyelik türü yönetimi (Faz 3 eklemeleri): sayman da görür. */
export const memberTypesPermissions = definePermissions("memberTypes", {
  ADMIN: ["view", "create", "update"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view"],
  VIEWER: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: [],
});

/** Kimlik numaralarını tam görme (DSGVO veri minimalizmi; diğerlerinde alan boş döner). */
export const memberIdentityPermissions = definePermissions("memberIdentity", {
  ADMIN: ["view"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: [],
  AUDITOR: [],
  TEACHER: [],
  VIEWER: [],
});

