import assert from "node:assert/strict";
import { describe, test } from "node:test";

process.env.DATABASE_URL ??= "postgresql://unused/never-connected";
process.env.AUTH_SECRET ??= "test-unified-tasks-meetings-secret-0123456789";

describe("Issue #636 — Unified Task Hub, Bylaw Notice-Period Check & Invitation PDF", () => {
  test("evaluateInvitationNoticePeriod enforces 14d/7d/3d statutory lead times", async () => {
    const { evaluateInvitationNoticePeriod } = await import(
      "@/modules/meetings/services/notice-period"
    );

    const meetingDate = new Date("2026-12-20T00:00:00Z");

    assert.deepEqual(
      evaluateInvitationNoticePeriod({
        type: "GENERAL_ASSEMBLY",
        meetingDate,
        invitationSentAt: null,
      }),
      { status: "not_sent", requiredDays: 14, actualDays: null },
    );

    assert.deepEqual(
      evaluateInvitationNoticePeriod({
        type: "GENERAL_ASSEMBLY",
        meetingDate,
        invitationSentAt: new Date("2026-12-06T00:00:00Z"),
      }),
      { status: "compliant", requiredDays: 14, actualDays: 14 },
    );

    assert.deepEqual(
      evaluateInvitationNoticePeriod({
        type: "GENERAL_ASSEMBLY",
        meetingDate,
        invitationSentAt: new Date("2026-12-07T00:00:00Z"),
      }),
      { status: "short_notice", requiredDays: 14, actualDays: 13 },
    );

    assert.deepEqual(
      evaluateInvitationNoticePeriod({
        type: "BOARD",
        meetingDate,
        invitationSentAt: new Date("2026-12-13T00:00:00Z"),
      }),
      { status: "compliant", requiredDays: 7, actualDays: 7 },
    );

    assert.deepEqual(
      evaluateInvitationNoticePeriod({
        type: "COMMITTEE",
        meetingDate,
        invitationSentAt: new Date("2026-12-18T00:00:00Z"),
      }),
      { status: "short_notice", requiredDays: 3, actualDays: 2 },
    );
  });

  test("unified-hub, crm/server, and invitation-pdf route files are wired", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = process.cwd();
    assert.ok(fs.existsSync(path.join(root, "src/modules/tasks/queries/unified-hub.ts")));
    assert.ok(fs.existsSync(path.join(root, "src/modules/tasks/components/linked-tasks-panel.tsx")));
    assert.ok(
      fs.existsSync(
        path.join(root, "src/app/api/(modules)/meetings/[id]/invitation-pdf/route.ts"),
      ),
    );
    const crmServer = fs.readFileSync(path.join(root, "src/modules/crm/server.ts"), "utf8");
    assert.match(crmServer, /listOpenFollowUpsForHub/);
  });

  test("requiredNoticeDaysForMeetingType returns 14 for GENERAL_ASSEMBLY, 7 for BOARD, 3 for others", async () => {
    const { requiredNoticeDaysForMeetingType } = await import(
      "@/modules/meetings/services/notice-period"
    );
    assert.equal(requiredNoticeDaysForMeetingType("GENERAL_ASSEMBLY"), 14);
    assert.equal(requiredNoticeDaysForMeetingType("BOARD"), 7);
    assert.equal(requiredNoticeDaysForMeetingType("COMMITTEE"), 3);
    assert.equal(requiredNoticeDaysForMeetingType("OTHER"), 3);
  });
});
