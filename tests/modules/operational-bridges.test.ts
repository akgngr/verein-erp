import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { normalizeProgrammaticDocumentInput } from "../../src/modules/documents/services/programmatic-document";
import { fetchInboxTask } from "../../src/modules/mail/automation";
import {
  buildCourseGuardianRecipients,
  courseLabel,
} from "../../src/modules/courses/recipients";

describe("Roadmap E1.3 Operational Bridges (#631)", () => {
  it("normalizes programmatic document inputs safely with date-only UTC and length bounds", () => {
    const res = normalizeProgrammaticDocumentInput({
      counterparty: "   ",
      subject: `  ${"A".repeat(250)}  `,
      summary: "  Brief note  ",
      referenceNumber: `  ${"R".repeat(120)}  `,
      documentDate: new Date("2026-11-27T15:42:11.000Z"),
    });

    assert.equal(res.counterparty, "—");
    assert.equal(res.subject.length, 200);
    assert.equal(res.summary, "Brief note");
    assert.equal(res.referenceNumber?.length, 100);
    assert.equal(res.documentDate.toISOString(), "2026-11-27T00:00:00.000Z");
  });

  it("registers scheduled mail.fetch_inbox task with 15-minute interval", () => {
    assert.equal(fetchInboxTask.key, "mail.fetch_inbox");
    assert.equal(fetchInboxTask.schedule?.minIntervalMinutes, 15);
    assert.equal(fetchInboxTask.schedule?.automaticIntervalMinutes, 15);
  });

  it("enforces dual RBAC (mailInbox.create + documents.create) and usability check on Mail-to-Documents transfer", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/modules/mail/actions/inbox-actions.ts"),
      "utf8",
    );
    const fnStart = src.indexOf("export async function importMessageToDocumentsAction");
    assert.ok(fnStart > 0, "importMessageToDocumentsAction must exist");
    const slice = src.slice(fnStart);
    assert.ok(slice.includes('permission: { definition: mailInboxPermissions, action: "create" }'));
    assert.ok(slice.includes('can(user.role, documentsPermissions, "create")'));
    assert.ok(slice.includes("await isDocumentsUsable()"));
  });

  it("resolves course guardians with ALL_GUARDIANS vs PAYER_ONLY, deduplicates siblings, and preserves opt-out & consents", () => {
    assert.equal(
      courseLabel({ code: "K-2026-01", title: "Mathematik 5. Klasse" }),
      "K-2026-01 · Mathematik 5. Klasse",
    );

    const courses = [
      { id: "c1", code: "K-2026-01", title: "Mathematik 5. Klasse" },
    ];
    const enrollments = [
      { courseId: "c1", studentId: "s1", studentLabel: "Emre Örnek", payerGuardianId: "g1" },
      { courseId: "c1", studentId: "s2", studentLabel: "Elif Örnek", payerGuardianId: "g1" },
      { courseId: "c1", studentId: "s3", studentLabel: "Lukas Muster", payerGuardianId: null },
    ];
    const guardiansById = new Map([
      [
        "g1",
        {
          id: "g1",
          salutation: "Frau",
          firstName: "Ayşe",
          lastName: "Örnek",
          email: "AYSE@example.org",
          phone: "+49170111111",
          bulkMailOptOut: false,
          messagingConsents: ["whatsapp", "sms"],
        },
      ],
      [
        "g2",
        {
          id: "g2",
          salutation: "Herr",
          firstName: "Ali",
          lastName: "Örnek",
          email: "ali@example.org",
          phone: null,
          bulkMailOptOut: true,
          messagingConsents: [],
        },
      ],
      [
        "g3",
        {
          id: "g3",
          salutation: "Frau",
          firstName: "Maria",
          lastName: "Muster",
          email: "maria@example.org",
          phone: "+49170222222",
          bulkMailOptOut: false,
          messagingConsents: ["telegram"],
        },
      ],
    ]);
    const linksByStudentId = new Map([
      [
        "s1",
        [
          { guardianId: "g1", isPayer: true },
          { guardianId: "g2", isPayer: false },
        ],
      ],
      ["s2", [{ guardianId: "g1", isPayer: true }]],
      ["s3", [{ guardianId: "g3", isPayer: true }]],
    ]);

    const allGuardians = buildCourseGuardianRecipients({
      courses,
      enrollments,
      guardiansById,
      linksByStudentId,
      payerOnly: false,
    });
    assert.equal(allGuardians.length, 3);
    const ayse = allGuardians.find((r) => r.id === "g1");
    assert.ok(ayse);
    assert.equal(ayse.email, "ayse@example.org");
    assert.equal(ayse.optOut, false);
    assert.deepEqual(ayse.consents, { whatsapp: true, sms: true });
    assert.equal(ayse.vars.courseCode, "K-2026-01");
    assert.equal(ayse.vars.courseTitle, "Mathematik 5. Klasse");

    const ali = allGuardians.find((r) => r.id === "g2");
    assert.ok(ali);
    assert.equal(ali.optOut, true);

    const payersOnly = buildCourseGuardianRecipients({
      courses,
      enrollments,
      guardiansById,
      linksByStudentId,
      payerOnly: true,
    });
    assert.deepEqual(
      payersOnly.map((r) => r.id),
      ["g1", "g3"],
    );
  });
});
