import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, test } from "node:test";

import { Prisma, type PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??= "postgresql://unused/never-connected";
process.env.AUTH_SECRET ??= "test-f5-courses-auth-secret-0123456789";

const read = (path: string) => fs.readFileSync(path, "utf8");
const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };

async function withDb<T>(db: PrismaClient, operation: () => Promise<T>): Promise<T> {
  const previous = prismaGlobal.prisma;
  prismaGlobal.prisma = db;
  try {
    return await operation();
  } finally {
    prismaGlobal.prisma = previous;
  }
}

describe("Pre-Live F5 (#579) — Courses, Progress & Students concurrency, integrity & audit", () => {
  test("approvePayout retries on P2002 sequence collision and blocks concurrent double-approval", async () => {
    const { approvePayoutCore } = await import("@/modules/courses/services/payout-core");

    let status: "DRAFT" | "APPROVED" = "DRAFT";
    let lastSequence = 3;
    let collideOnce = true;

    const db = {
      courseTeacherPayout: {
        findUnique: async () => ({ id: "p-1", period: "2026-10", status }),
        findFirst: async () => ({ sequence: lastSequence }),
        updateMany: async ({ where, data }: { where: { id: string; status: string }; data: { status: "APPROVED"; sequence: number } }) => {
          if (where.status !== status) return { count: 0 };
          if (collideOnce) {
            collideOnce = false;
            lastSequence += 1; // Another concurrent transaction took sequence 4
            throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed on (year, sequence)", {
              code: "P2002",
              clientVersion: "test",
            });
          }
          status = data.status;
          lastSequence = data.sequence;
          return { count: 1 };
        },
      },
      $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(db),
    } as unknown as PrismaClient;

    await withDb(db, async () => {
      const number = await approvePayoutCore("p-1", { id: "u-1", label: "Admin" });
      assert.equal(number, "HA-2026-0005");
      assert.equal(status, "APPROVED");

      await assert.rejects(
        () => approvePayoutCore("p-1", { id: "u-1", label: "Admin" }),
        /courses\.payouts\.errors\.notDraft/,
      );
    });
  });

  test("listPayouts fetches yearly totals in a single batched query (no N+1 per row)", async () => {
    const { listPayoutsCore } = await import("@/modules/courses/services/payout-core");

    let payoutFindManyCalls = 0;
    let profileCalls = 0;
    const rows = Array.from({ length: 12 }, (_, idx) => ({
      id: `p-${idx}`,
      teacherId: `t-${idx}`,
      period: "2026-10",
      status: "APPROVED" as const,
      number: `HA-2026-${String(idx + 1).padStart(4, "0")}`,
      compensation: "EHRENAMT",
      sessionCount: 4,
      minutes: 240,
      amountCents: 30000,
      bookingNumber: null,
      paidAt: null,
      teacher: { firstName: "Teacher", lastName: `N${idx}`, userId: idx % 3 === 0 ? `u-${idx % 2}` : null },
    }));

    const db = {
      coursesSettings: {
        findUnique: async () => ({
          id: "singleton",
          incomeCategoryId: null,
          payoutCategoryId: null,
          defaultSessionMinutes: 60,
          uebungsleiterLimitCents: 330000,
          ehrenamtLimitCents: 96000,
        }),
      },
      courseTeacherPayout: {
        findMany: async () => {
          payoutFindManyCalls += 1;
          if (payoutFindManyCalls === 1) return rows;
          return rows.map((row) => ({ teacherId: row.teacherId, period: row.period, amountCents: 100000 }));
        },
      },
    } as unknown as PrismaClient;

    await withDb(db, async () => {
      const listed = await listPayoutsCore(
        { period: "2026-10" },
        { uebungsleiterLimitCents: 330000, ehrenamtLimitCents: 96000 },
        async () => {
          profileCalls += 1;
          return true;
        },
      );
      assert.equal(listed.length, 12);
      // 1 query for rows + 1 batched query for yearly totals = 2 total (NOT 1 + 12)
      assert.equal(payoutFindManyCalls, 2);
      // Only 2 unique userIds across 4 linked rows -> profile lookup deduplicated
      assert.equal(profileCalls, 2);
      assert.ok(listed.every((item) => item.limitExceeded === true));
    });
  });

  test("fee-actions.ts performs atomic $transaction + conditional updateMany for payment, reversal, and waiver", () => {
    const src = read("src/modules/courses/actions/fee-actions.ts");
    const txBlocks = src.match(/\$transaction\s*\(\s*async\s*\(\s*tx\s*\)/g) ?? [];
    assert.ok(txBlocks.length >= 3, "recordPayment, reversePayment, and waiveCharge must all use interactive $transaction");
    assert.match(src, /tx\.courseCharge\.updateMany\(\{\s*where:\s*\{\s*id:\s*charge\.id,\s*status:\s*"OPEN"\s*\},\s*data:\s*\{\s*status:\s*"PAID"\s*\}/s);
    assert.match(src, /tx\.coursePayment\.updateMany\(\{\s*where:\s*\{\s*id:\s*payment\.id,\s*reversedAt:\s*null\s*\}/s);
    assert.match(src, /tx\.courseCharge\.updateMany\(\{\s*where:\s*\{\s*id:\s*charge\.id,\s*status:\s*"OPEN"\s*\},\s*data:\s*\{\s*status:\s*"WAIVED"/s);
    assert.match(src, /claimed\.count !== 1/);
  });

  test("enrollment-actions.ts checks course capacity inside $transaction with course row lock", () => {
    const src = read("src/modules/courses/actions/enrollment-actions.ts");
    const txIndex = src.indexOf("db.$transaction(async (tx)");
    const lockIndex = src.indexOf("tx.course.update(");
    const capacityIndex = src.indexOf("courses.errors.capacityExceeded");
    assert.ok(txIndex > 0 && lockIndex > txIndex && capacityIndex > lockIndex, "capacity check must execute inside $transaction after locking course row");
  });

  test("session-actions.ts blocks deleting sessions locked in APPROVED/PAID payouts and cleans up ProgressAttendance", () => {
    const src = read("src/modules/courses/actions/session-actions.ts");
    assert.match(src, /courses\.errors\.sessionInLockedPayout/);
    assert.match(src, /status:\s*\{\s*in:\s*\["APPROVED",\s*"PAID"\]\s*\}/);
    assert.match(src, /tx\.progressAttendance\.deleteMany\(\{\s*where:\s*\{\s*sessionId:\s*existing\.id\s*\}\s*\}\)/);
  });

  test("PDF exports for teacher payouts and minor student progress reports write EXPORT audit logs without PII", () => {
    const payoutPdf = read("src/modules/courses/services/payout-pdf-handler.tsx");
    assert.match(payoutPdf, /writeAudit\(\{/);
    assert.match(payoutPdf, /action:\s*"EXPORT"/);
    assert.match(payoutPdf, /entity:\s*"CourseTeacherPayout"/);
    const payoutAuditCall = payoutPdf.slice(payoutPdf.indexOf("writeAudit({"), payoutPdf.indexOf("});", payoutPdf.indexOf("writeAudit({")));
    assert.doesNotMatch(payoutAuditCall, /iban|bic|taxNumber|vatId/i);

    const progressPdf = read("src/modules/progress/services/report-handler.tsx");
    assert.match(progressPdf, /writeAudit\(\{/);
    assert.match(progressPdf, /action:\s*"EXPORT"/);
    assert.match(progressPdf, /entity:\s*"CourseEnrollment"/);
    const progressAuditCall = progressPdf.slice(progressPdf.indexOf("writeAudit({"), progressPdf.indexOf("});", progressPdf.indexOf("writeAudit({")));
    assert.doesNotMatch(progressAuditCall, /studentLabel|firstName|lastName/i);
  });

  test("progress saveAttendanceAction rejects cancelled sessions and withdrawn enrollments", () => {
    const src = read("src/modules/progress/actions/progress-actions.ts");
    assert.match(src, /session\.isCancelled/);
    assert.match(src, /progress\.errors\.sessionCancelled/);
    assert.match(src, /WITHDRAWN/);
    assert.match(src, /progress\.errors\.enrollmentWithdrawn/);
  });

  test("students online-form filters soft-deleted guardians and SELF_PAYER audit omits guardian PII name", () => {
    const onlineForm = read("src/modules/students/services/online-form.ts");
    const guardianFn = onlineForm.slice(onlineForm.indexOf("export async function getGuardianSelfService"), onlineForm.indexOf("export async function applyGuardianSelfService"));
    assert.match(guardianFn, /deletedAt:\s*null/);
    assert.doesNotMatch(guardianFn, /findUnique\(/);

    const applyFn = onlineForm.slice(onlineForm.indexOf("export async function applyGuardianSelfService"), onlineForm.indexOf("export async function getGuardianIdsByDebtorNumber"));
    assert.match(applyFn, /deletedAt:\s*null/);

    const studentActions = read("src/modules/students/actions/student-actions.ts");
    const selfPayerAudit = studentActions.slice(studentActions.indexOf('action: "SELF_PAYER"'), studentActions.indexOf("return { guardianId", studentActions.indexOf('action: "SELF_PAYER"')));
    assert.doesNotMatch(selfPayerAudit, /personName\(/);
    assert.match(selfPayerAudit, /guardianId:\s*guardian\.id/);
  });
});
