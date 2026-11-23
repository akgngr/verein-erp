import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { accountingPermissions, accountingSetupPermissions } from "@/modules/accounting/permissions";
import {
  AUDIT_ROOM_SECTIONS,
  canAccessAuditRoom,
  canManageAuditRooms,
  canRecordAuditFinding,
  isAuditRoomActive,
  summarizeAuditRoomForPdf,
} from "@/modules/accounting/services/audit-room-core";
import { aiPermissions } from "@/modules/ai/permissions";
import { auditPermissions } from "@/modules/audit/permissions";
import { donationsPermissions } from "@/modules/donations/permissions";
import { progressPermissions } from "@/modules/progress/permissions";
import { systemPermissions } from "@/modules/system/permissions";
import { usersPermissions } from "@/modules/users/permissions";
import { can } from "@/shared/permissions/define";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("time-boxed audit room enforces start, expiry, revocation, and user scoping", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  const activeRoom = {
    startsAt: new Date("2026-11-20T00:00:00Z"),
    expiresAt: new Date("2026-11-30T00:00:00Z"),
    revokedAt: null,
    auditorUserId: "auditor-1",
  };

  assert.equal(isAuditRoomActive(activeRoom, now), true);
  assert.equal(canAccessAuditRoom({ id: "auditor-1", role: "AUDITOR" }, activeRoom, now), true);
  assert.equal(canAccessAuditRoom({ id: "auditor-2", role: "AUDITOR" }, activeRoom, now), false);

  // Expired room automatically denies auditor access
  const afterExpiry = new Date("2026-12-01T00:00:00Z");
  assert.equal(isAuditRoomActive(activeRoom, afterExpiry), false);
  assert.equal(canAccessAuditRoom({ id: "auditor-1", role: "AUDITOR" }, activeRoom, afterExpiry), false);
  assert.equal(canRecordAuditFinding({ id: "auditor-1", role: "AUDITOR" }, activeRoom, afterExpiry), false);

  // Revoked room automatically denies auditor access
  const revokedRoom = { ...activeRoom, revokedAt: new Date("2026-11-23T10:00:00Z") };
  assert.equal(isAuditRoomActive(revokedRoom, now), false);
  assert.equal(canAccessAuditRoom({ id: "auditor-1", role: "AUDITOR" }, revokedRoom, now), false);

  // Managers (ADMIN / TREASURER) retain management access
  assert.equal(canAccessAuditRoom({ id: "admin-1", role: "ADMIN" }, revokedRoom, now), true);
  assert.equal(canAccessAuditRoom({ id: "treasurer-1", role: "TREASURER" }, revokedRoom, now), true);
});

test("least privilege: AUDITOR cannot write accounting records or see out-of-scope modules", () => {
  // Cannot write or approve in accounting
  assert.equal(can("AUDITOR", accountingPermissions, "view"), true);
  assert.equal(can("AUDITOR", accountingPermissions, "create"), false);
  assert.equal(can("AUDITOR", accountingPermissions, "update"), false);
  assert.equal(can("AUDITOR", accountingPermissions, "delete"), false);
  assert.equal(can("AUDITOR", accountingPermissions, "approve"), false);

  assert.equal(can("AUDITOR", accountingSetupPermissions, "view"), true);
  assert.equal(can("AUDITOR", accountingSetupPermissions, "create"), false);
  assert.equal(can("AUDITOR", accountingSetupPermissions, "update"), false);

  assert.equal(canManageAuditRooms("AUDITOR"), false);
  assert.equal(canManageAuditRooms("TREASURER"), true);
  assert.equal(canManageAuditRooms("ADMIN"), true);

  // Cannot see modules outside audit scope
  assert.equal(can("AUDITOR", usersPermissions, "view"), false);
  assert.equal(can("AUDITOR", auditPermissions, "view"), false);
  assert.equal(can("AUDITOR", systemPermissions, "view"), false);
  assert.equal(can("AUDITOR", aiPermissions, "view"), false);
  assert.equal(can("AUDITOR", progressPermissions, "view"), false);
  assert.equal(can("AUDITOR", donationsPermissions, "view"), false);
});

test("guided checklist covers all 5 sections and feeds findings into auditor report PDF", () => {
  assert.deepEqual(AUDIT_ROOM_SECTIONS, [
    "BOOKING_SAMPLE",
    "RECEIPT_COMPLETENESS",
    "CASH_COUNTS",
    "BANK_RECONCILIATION",
    "OPEN_ITEMS",
  ]);

  const summary = summarizeAuditRoomForPdf(
    [
      { section: "BOOKING_SAMPLE", checked: true, note: "15 Buchungen geprüft" },
      { section: "CASH_COUNTS", checked: true, note: "Kasse stimmt" },
    ],
    [
      {
        section: "RECEIPT_COMPLETENESS",
        severity: "ISSUE",
        status: "OPEN",
        summary: "Beleg B-2026-0042 fehlt",
        detail: "Nachreichen bis Mitgliederversammlung",
      },
    ],
  );

  assert.equal(summary.checklist.length, 5);
  assert.equal(summary.checklist[0].checked, true);
  assert.equal(summary.checklist[1].checked, false);
  assert.equal(summary.findings.length, 1);
  assert.equal(summary.findings[0].severity, "ISSUE");

  const pdfDocSrc = read("src/modules/accounting/pdf/auditor-report-document.tsx");
  assert.match(pdfDocSrc, /checklistSummary/);
  assert.match(pdfDocSrc, /findings/);

  const handlerSrc = read("src/modules/accounting/handlers/auditor-report.tsx");
  assert.match(handlerSrc, /loadAuditRoomPdfData/);
  assert.match(handlerSrc, /status:\s*403/);
});

test("all audit room views are audited and actions are permission-gated", () => {
  const serviceSrc = read("src/modules/accounting/services/audit-room.ts");
  assert.match(serviceSrc, /writeAudit\(/);
  assert.match(serviceSrc, /entity:\s*"AccountingAuditRoom"/);

  const actionsSrc = read("src/modules/accounting/actions/audit-room-actions.ts");
  assert.match(actionsSrc, /createAuditRoomAction/);
  assert.match(actionsSrc, /revokeAuditRoomAction/);
  assert.match(actionsSrc, /action:\s*"approve"/);
});
