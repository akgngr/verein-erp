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
  it("evaluates guideline invitation notice periods for General Assembly, Board, and Committee meetings", () => {
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

  it("counts the sending day on the Europe/Berlin calendar, not the UTC date", () => {
    // 00:30 Berlin on 2026-12-07 is still 2026-12-06 in UTC: 13 days, not 14.
    const shortByBerlinDay = evaluateInvitationNoticePeriod({
      meetingType: "GENERAL_ASSEMBLY",
      meetingDate: new Date("2026-12-20T00:00:00Z"),
      invitationSentAt: new Date("2026-12-06T23:30:00Z"),
    });
    assert.deepEqual(shortByBerlinDay, { requiredDays: 14, actualDays: 13, status: "short_notice" });
    // Summer time: 01:30 CEST on 2026-07-02 is 2026-07-01T23:30Z.
    const summer = evaluateInvitationNoticePeriod({
      meetingType: "BOARD",
      meetingDate: new Date("2026-07-09T00:00:00Z"),
      invitationSentAt: new Date("2026-07-01T23:30:00Z"),
    });
    assert.deepEqual(summer, { requiredDays: 7, actualDays: 7, status: "compliant" });
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
    // The member-facing invitation must not print the internal guideline check
    // ("compliant with the bylaws" is not something the software can know).
    assert.ok(!invSrc.includes("evaluateInvitationNoticePeriod"));
    const docSrc = readFileSync(
      path.join(process.cwd(), "src/modules/meetings/pdf/invitation-document.tsx"),
      "utf8",
    );
    assert.doesNotMatch(docSrc, /satzungskonform|tüzüğe uygun|noticeEvaluation|Noch nicht versandt/);
  });

  it("maps CRM follow-ups by their deadline instant: Berlin display day, overdue once passed, CRM deep link", async () => {
    const { toCrmHubItem } = await import("../../src/modules/tasks/services/unified-hub-sort");
    const row = { id: "f1", note: "Call back", partyId: "party-1", partyName: "Synthetic GmbH" };
    // 00:30 CET on 7 December is still 6 December in UTC.
    const early = toCrmHubItem({ ...row, dueAt: "2026-12-06T23:30:00.000Z" }, new Date("2026-12-06T22:00:00.000Z"));
    assert.equal(early.dueDate, "2026-12-07");
    assert.equal(early.isOverdue, false);
    // Same day, deadline already passed: overdue, like the CRM list.
    const passed = toCrmHubItem({ ...row, dueAt: "2026-12-07T09:00:00.000Z" }, new Date("2026-12-07T10:00:00.000Z"));
    assert.equal(passed.dueDate, "2026-12-07");
    assert.equal(passed.isOverdue, true);
    assert.equal(passed.href, "/crm?kayit=party-1");

    const view = readFileSync(path.join(process.cwd(), "src/modules/crm/views/crm-view.tsx"), "utf8");
    assert.ok(view.includes("(await searchParams)?.kayit"), "CRM view reads the deep link");
    assert.ok(view.includes("parties.some((party) => party.id === openParam)"), "only a listed party can be opened");
  });
});
