import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  DEFAULT_NOTICE_DAYS_BY_TYPE,
  evaluateInvitationNoticePeriod,
} from "../../src/modules/meetings/services/notice-period";
import {
  sortUnifiedLinkedItems,
  type UnifiedLinkedTaskItem,
} from "../../src/modules/tasks/services/unified-hub-sort";

describe("Roadmap E2.6 Unified Task Hub & Meetings Governance (#636)", () => {
  it("evaluates statutory bylaw invitation notice periods for General Assembly, Board, and Committee meetings", () => {
    assert.equal(DEFAULT_NOTICE_DAYS_BY_TYPE.GENERAL_ASSEMBLY, 14);
    assert.equal(DEFAULT_NOTICE_DAYS_BY_TYPE.BOARD, 7);
    assert.equal(DEFAULT_NOTICE_DAYS_BY_TYPE.COMMITTEE, 3);

    const meetingDate = new Date("2026-12-20T18:00:00Z");

    // 15 days before General Assembly => compliant
    const okGa = evaluateInvitationNoticePeriod({
      meetingType: "GENERAL_ASSEMBLY",
      meetingDate,
      invitationSentAt: new Date("2026-12-05T10:00:00Z"),
    });
    assert.deepEqual(okGa, { requiredDays: 14, actualDays: 15, status: "compliant" });

    // 10 days before General Assembly => short_notice
    const shortGa = evaluateInvitationNoticePeriod({
      meetingType: "GENERAL_ASSEMBLY",
      meetingDate,
      invitationSentAt: new Date("2026-12-10T10:00:00Z"),
    });
    assert.deepEqual(shortGa, { requiredDays: 14, actualDays: 10, status: "short_notice" });

    // 7 days before Board meeting => compliant
    const okBoard = evaluateInvitationNoticePeriod({
      meetingType: "BOARD",
      meetingDate,
      invitationSentAt: new Date("2026-12-13T08:00:00Z"),
    });
    assert.deepEqual(okBoard, { requiredDays: 7, actualDays: 7, status: "compliant" });

    // Not sent => not_sent
    const notSent = evaluateInvitationNoticePeriod({
      meetingType: "COMMITTEE",
      meetingDate,
      invitationSentAt: null,
    });
    assert.deepEqual(notSent, { requiredDays: 3, actualDays: null, status: "not_sent" });
  });

  it("sorts unified linked items with earliest due dates first and undated items last", () => {
    const items: UnifiedLinkedTaskItem[] = [
      {
        id: "m1",
        source: "meetings",
        title: "Undated action",
        contextLabel: "TOP-2026-001",
        assigneeLabel: null,
        dueDate: null,
        isOverdue: false,
        href: "/toplantilar/m1",
      },
      {
        id: "c1",
        source: "crm",
        title: "Call sponsor",
        contextLabel: "Muster GmbH",
        assigneeLabel: null,
        dueDate: "2026-11-30",
        isOverdue: false,
        href: "/crm/p1",
      },
      {
        id: "m2",
        source: "meetings",
        title: "Overdue protocol fix",
        contextLabel: "TOP-2026-002",
        assigneeLabel: "Ayşe",
        dueDate: "2026-11-20",
        isOverdue: true,
        href: "/toplantilar/m2",
      },
    ];

    const sorted = sortUnifiedLinkedItems(items);
    assert.deepEqual(
      sorted.map((x) => x.id),
      ["m2", "c1", "m1"],
    );
  });

  it("enforces module usability and per-module view RBAC in Unified Task Hub and Invitation PDF handler", () => {
    const hubSrc = readFileSync(
      path.join(process.cwd(), "src/modules/tasks/queries/unified-hub.ts"),
      "utf8",
    );
    assert.ok(hubSrc.includes("listUsableModuleKeys()"));
    assert.ok(hubSrc.includes('can(user.role, meetingsPermissions, "view")'));
    assert.ok(hubSrc.includes('can(user.role, crmPermissions, "view")'));

    const invSrc = readFileSync(
      path.join(process.cwd(), "src/modules/meetings/handlers/export-invitation-pdf.tsx"),
      "utf8",
    );
    assert.ok(invSrc.includes("await requireUser()"));
    assert.ok(invSrc.includes('can(user.role, meetingsPermissions, "view")'));
    assert.ok(invSrc.includes("evaluateInvitationNoticePeriod"));
  });
});
