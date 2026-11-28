import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { test } from "node:test";

import { recipients } from "@/modules/courses/recipients";
import { getDb } from "@/shared/db";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.AI_TEST_DATABASE_URL !== process.env.DATABASE_URL) throw new Error("Use an isolated database");

const source = recipients.sources.find((item) => item.key === "guardians");

test("course guardian campaigns never reach a family only through a soft-deleted student", { skip: !enabled }, async () => {
  assert.ok(source, "courses guardians source must exist");
  const db = getDb();
  const tag = `rcp-${randomUUID().slice(0, 8)}`;
  const sequence = randomInt(500_000, 900_000);
  const creator = { createdById: tag, createdByLabel: "SYNTHETIC" };
  const course = await db.course.create({
    data: { id: `${tag}-course`, code: `${tag}-K`, title: "Synthetic course", kind: "COURSE", year: 2099, sequence, startDate: new Date("2099-01-10"), ...creator },
  });
  const student = (suffix: string, offset: number, deleted: boolean) =>
    db.student.create({
      data: { id: `${tag}-${suffix}`, year: 2099, sequence: sequence + offset, studentNumber: `${tag}-${suffix}`, firstName: "Synthetic", lastName: suffix, ...creator, ...(deleted ? { deletedAt: new Date() } : {}) },
    });
  const guardian = (suffix: string, offset: number) =>
    db.studentGuardian.create({
      data: { id: `${tag}-${suffix}`, debtorNumber: 70_000_000 + sequence + offset, firstName: "Synthetic", lastName: suffix, email: `${tag}-${suffix}@example.org`, ...creator },
    });
  try {
    await student("active", 0, false);
    await student("deleted", 1, true);
    await guardian("g-active", 0);
    await guardian("g-deleted", 1);
    await db.studentGuardianLink.create({ data: { studentId: `${tag}-active`, guardianId: `${tag}-g-active`, relation: "MOTHER", isPayer: true } });
    await db.studentGuardianLink.create({ data: { studentId: `${tag}-deleted`, guardianId: `${tag}-g-deleted`, relation: "FATHER", isPayer: true } });
    for (const suffix of ["active", "deleted"]) {
      await db.courseEnrollment.create({
        data: { courseId: course.id, studentId: `${tag}-${suffix}`, studentLabel: `Synthetic ${suffix}`, studentNumber: `${tag}-${suffix}`, payerGuardianId: `${tag}-g-${suffix}`, enrolledAt: new Date("2099-01-10"), ...creator },
      });
    }
    const label = `${course.code} · ${course.title}`.slice(0, 48);
    for (const role of ["ALL_GUARDIANS", "PAYER_ONLY"]) {
      const resolved = await source.resolve({ course: [label], status: ["ACTIVE"], role: [role] });
      assert.deepEqual(resolved.map((item) => item.id), [`${tag}-g-active`], role);
    }
  } finally {
    await db.courseEnrollment.deleteMany({ where: { courseId: course.id } });
    await db.studentGuardianLink.deleteMany({ where: { studentId: { startsWith: tag } } });
    await db.studentGuardian.deleteMany({ where: { id: { startsWith: tag } } });
    await db.student.deleteMany({ where: { id: { startsWith: tag } } });
    await db.course.deleteMany({ where: { id: course.id } });
  }
});

test.after(async () => {
  if (enabled) await getDb().$disconnect();
});
