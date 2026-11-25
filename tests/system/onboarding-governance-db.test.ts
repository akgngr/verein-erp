import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { getDb } from "@/shared/db";

// #583: Veritabanı gerektirir (sentetik veri, kişi verisi yok).
const enabled = Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET);

test("readiness: automation health reads the real executions table (failed jobs are no longer 0)", { skip: !enabled }, async () => {
  const { getAutomationHealthByModule } = await import("@/modules/automation/queries/health-snapshot");
  const { listEnabledNotificationChannels } = await import("@/modules/notifications/queries/enabled-channels");
  const db = getDb();
  const sourceModule = `p4-test-${randomUUID().slice(0, 8)}`;
  const row = await db.automationExecution.create({
    data: { definitionKey: "p4.test", definitionVersion: 1, organizationId: "default", sourceModule, correlationId: "p4-test", status: "FAILED", lastErrorCode: "P4_TEST" },
    select: { id: true },
  });
  try {
    const health = await getAutomationHealthByModule();
    assert.deepEqual(health.failed[sourceModule], [{ code: "P4_TEST" }]);
    assert.ok(Array.isArray(await listEnabledNotificationChannels()));
  } finally {
    await db.automationExecution.delete({ where: { id: row.id } });
  }
});

test("feedback: deleting a user anonymizes their reports (DSGVO Art. 17)", { skip: !enabled }, async () => {
  const { lifecycle, DELETED_REPORTER_ID } = await import("@/modules/feedback/lifecycle");
  const db = getDb();
  const reporterId = `p4-user-${randomUUID()}`;
  const item = await db.feedbackItem.create({
    data: { type: "BUG", title: "Test", description: "Synthetic", reporterId, reporterLabel: "Test Person <t@example.org>", pageUrl: "/members/abc", userAgent: "UA" },
    select: { id: true },
  });
  try {
    await lifecycle.onUserDeleted?.(reporterId);
    const after = await db.feedbackItem.findUnique({ where: { id: item.id } });
    assert.equal(after?.reporterId, DELETED_REPORTER_ID);
    assert.equal(after?.reporterLabel, "—");
    assert.equal(after?.pageUrl, null);
    assert.equal(after?.userAgent, null);
    assert.equal(after?.title, "Test", "the product report itself is kept");
  } finally {
    await db.feedbackItem.delete({ where: { id: item.id } });
  }
});

test("portal subject log includes board-recorded payments matched by member number", { skip: !enabled }, async () => {
  const { listSubjectAuditLogsForPortal } = await import("@/modules/audit/queries/list-subject-audit-logs");
  const db = getDb();
  const memberNumber = `T-${randomUUID().slice(0, 8)}`;
  const otherNumber = `T-${randomUUID().slice(0, 8)}`;
  const rows = await Promise.all([
    db.auditLog.create({ data: { userId: "board-user", action: "CREATE", entity: "MemberPayment", entityId: "pay-1", changes: { before: null, after: { memberNumber, receiptNumber: "R-1" } } }, select: { id: true } }),
    db.auditLog.create({ data: { userId: "board-user", action: "CREATE", entity: "MemberPayment", entityId: "pay-2", changes: { before: null, after: { memberNumber: otherNumber, receiptNumber: "R-2" } } }, select: { id: true } }),
  ]);
  // AuditLog is append-only (DB trigger); the synthetic rows carry random ids and no personal data.
  const entries = await listSubjectAuditLogsForPortal({ subjectRef: `member:${randomUUID()}`, memberId: randomUUID(), memberNumber });
  const ids = entries.map((entry) => entry.id);
  assert.ok(ids.includes(rows[0].id), "own payment is listed");
  assert.ok(!ids.includes(rows[1].id), "another member's payment is not");
  assert.equal(entries.find((entry) => entry.id === rows[0].id)?.category, "receipts");
  assert.equal(entries.find((entry) => entry.id === rows[0].id)?.actorRole, "BOARD");
});
