import { can } from "@/shared/permissions/define";
import { isTimeBoxActive } from "@/shared/security/external-grant";

import { accountingPermissions } from "../permissions";

export const AUDIT_ROOM_SECTIONS = [
  "BOOKING_SAMPLE",
  "RECEIPT_COMPLETENESS",
  "CASH_COUNTS",
  "BANK_RECONCILIATION",
  "OPEN_ITEMS",
] as const;

export type AuditRoomSectionKey = (typeof AUDIT_ROOM_SECTIONS)[number];
export type AuditFindingSeverityKey = "INFO" | "NOTE" | "ISSUE";
export type AuditFindingStatusKey = "OPEN" | "RESOLVED";

export type AuditRoomWindow = {
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  auditorUserId: string | null;
};

export type AuditActor = {
  id: string;
  role: string;
};

/** Returns true only while the audit room is neither revoked nor outside [startsAt, expiresAt). */
export function isAuditRoomActive(room: Pick<AuditRoomWindow, "startsAt" | "expiresAt" | "revokedAt">, now = new Date()): boolean {
  return isTimeBoxActive(room, now);
}

/** Only roles with accounting:approve (ADMIN / TREASURER) may create or revoke audit rooms. */
export function canManageAuditRooms(role: string): boolean {
  return can(role, accountingPermissions, "approve");
}

/** Auditors cannot write to accounting books; only accounting:view + active time-boxed room grants read access. */
export function canAccessAuditRoom(actor: AuditActor, room: AuditRoomWindow, now = new Date()): boolean {
  if (canManageAuditRooms(actor.role)) return true;
  if (!can(actor.role, accountingPermissions, "view")) return false;
  if (!isAuditRoomActive(room, now)) return false;
  return room.auditorUserId === null || room.auditorUserId === actor.id;
}

/**
 * Recording checklist ticks or findings inside an active audit room is allowed for
 * the assigned AUDITOR (while the room is active) or accounting:approve managers.
 * It never grants write access to accounting bookings, invoices, or accounts.
 */
export function canRecordAuditFinding(actor: AuditActor, room: AuditRoomWindow, now = new Date()): boolean {
  return canAccessAuditRoom(actor, room, now);
}

export type AuditRoomFindingRecord = {
  section: AuditRoomSectionKey;
  severity: AuditFindingSeverityKey;
  status: AuditFindingStatusKey;
  summary: string;
  detail: string | null;
};

export type AuditRoomChecklistRecord = {
  section: AuditRoomSectionKey;
  checked: boolean;
  note: string | null;
};

export function summarizeAuditRoomForPdf(
  checklist: readonly AuditRoomChecklistRecord[],
  findings: readonly AuditRoomFindingRecord[],
) {
  const checklistBySection = new Map(checklist.map((item) => [item.section, item]));
  return {
    checklist: AUDIT_ROOM_SECTIONS.map((section) => {
      const entry = checklistBySection.get(section);
      return {
        section,
        checked: entry?.checked ?? false,
        note: entry?.note ?? null,
      };
    }),
    findings: findings.map((item) => ({
      section: item.section,
      severity: item.severity,
      status: item.status,
      summary: item.summary,
      detail: item.detail,
    })),
  };
}
