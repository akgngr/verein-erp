import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??= "postgresql://unused/never-connected";
process.env.AUTH_SECRET ??= "test-courses-recipients-secret-0123456789";

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

describe("Issue #631 — Course guardians recipient source", () => {
  test("loadOptions returns non-deleted courses formatted as code — title", async () => {
    const { recipients } = await import("@/modules/courses/recipients");
    const source = recipients.sources.find((r) => r.key === "courseGuardians");
    assert.ok(source);
    const courseFilter = source.filters.find((f) => f.key === "course");
    assert.ok(courseFilter?.loadOptions);

    const db = {
      course: {
        findMany: async () => [
          { code: "K-2026-001", title: "Matematik" },
          { code: "K-2026-002", title: "Almanca" },
        ],
      },
    } as unknown as PrismaClient;

    const options = await withDb(db, () => courseFilter.loadOptions!());
    assert.deepEqual(options, ["K-2026-001 — Matematik", "K-2026-002 — Almanca"]);
  });

  test("resolve filters by course code, status, role and deduplicates guardians", async () => {
    const { recipients } = await import("@/modules/courses/recipients");
    const source = recipients.sources.find((r) => r.key === "courseGuardians");
    assert.ok(source);

    let capturedEnrollmentWhere: unknown = null;
    let capturedLinkWhere: unknown = null;

    const db = {
      courseEnrollment: {
        findMany: async ({ where }: { where: unknown }) => {
          capturedEnrollmentWhere = where;
          return [
            { studentId: "stu-1", course: { title: "Matematik" } },
            { studentId: "stu-2", course: { title: "Matematik" } },
          ];
        },
      },
      studentGuardianLink: {
        findMany: async ({ where }: { where: unknown }) => {
          capturedLinkWhere = where;
          return [
            {
              studentId: "stu-1",
              isPayer: true,
              guardian: {
                id: "g-1",
                salutation: "Frau",
                firstName: "Ayşe",
                lastName: "Yılmaz",
                email: "ayse@example.com",
                phone: "+491701234567",
                bulkMailOptOut: false,
                messagingConsents: ["whatsapp"],
              },
            },
            {
              studentId: "stu-2",
              isPayer: true,
              guardian: {
                id: "g-1", // same guardian for second child -> should deduplicate
                salutation: "Frau",
                firstName: "Ayşe",
                lastName: "Yılmaz",
                email: "ayse@example.com",
                phone: "+491701234567",
                bulkMailOptOut: false,
                messagingConsents: ["whatsapp"],
              },
            },
            {
              studentId: "stu-2",
              isPayer: false,
              guardian: {
                id: "g-2",
                salutation: "Herr",
                firstName: "Ali",
                lastName: "Yılmaz",
                email: "ali@example.com",
                phone: null,
                bulkMailOptOut: true,
                messagingConsents: [],
              },
            },
          ];
        },
      },
    } as unknown as PrismaClient;

    const resolved = await withDb(db, () =>
      source.resolve({
        course: ["K-2026-001 — Matematik"],
        status: ["ACTIVE"],
        role: ["ALL_GUARDIANS"],
      }),
    );

    assert.deepEqual(capturedEnrollmentWhere, {
      status: { in: ["ACTIVE"] },
      course: { deletedAt: null, code: { in: ["K-2026-001"] } },
    });
    assert.deepEqual(capturedLinkWhere, {
      studentId: { in: ["stu-1", "stu-2"] },
      student: { deletedAt: null },
      guardian: { deletedAt: null },
    });

    assert.equal(resolved.length, 2);
    assert.equal(resolved[0].id, "g-1");
    assert.equal(resolved[0].optOut, false);
    assert.deepEqual(resolved[0].consents, { whatsapp: true });
    assert.equal(resolved[0].vars.courseTitle, "Matematik");
    assert.equal(resolved[1].id, "g-2");
    assert.equal(resolved[1].optOut, true);
  });
});
