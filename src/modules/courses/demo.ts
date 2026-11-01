import "server-only";

import { getDb } from "@/shared/db";
import { DEMO_NOTE, clearRefs, daysFromNow, defineDemo, demoPerson } from "@/shared/demo/define";

import { COURSE_CODE_PREFIX } from "./constants";

const SUBJECTS = ["Mathematik", "Deutsch", "Englisch", "Physik", "Chemie", "Biologie", "Türkisch", "Informatik", "Musik", "Kunst"];

/** 10 öğretmen, 10 kurs; demo öğrencileri varsa her kursa 3'er kayıt. Ücret/tahakkuk üretilmez. */
export const demo = defineDemo({
  moduleKey: "courses",
  order: 30,
  async seed(ctx) {
    const db = getDb();
    const year = new Date().getUTCFullYear();
    const refs = ctx.refs;
    const teacherIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const p = demoPerson(i + 300);
      const teacher = await db.courseTeacher.create({
        data: { firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone, subjects: SUBJECTS[i], note: DEMO_NOTE },
        select: { id: true },
      });
      teacherIds.push(teacher.id);
      refs.push({ model: "courseTeacher", id: teacher.id });
    }
    const studentRows = (ctx.created.students ?? []).filter((r) => r.model === "student");
    for (let i = 0; i < 10; i++) {
      const sequence = 9001 + i;
      const course = await db.course.create({
        data: {
          year,
          sequence,
          code: `${COURSE_CODE_PREFIX}-${year}-${sequence}`,
          kind: i % 3 === 0 ? "TUTORING" : "COURSE",
          title: `${SUBJECTS[i]} (Demo)`,
          subject: SUBJECTS[i],
          location: `Raum ${i + 1}`,
          scheduleNote: i % 2 === 0 ? "Mo 16:00–17:30" : "Mi 15:00–16:30",
          startDate: daysFromNow(-14 + i),
          endDate: daysFromNow(150 + i),
          capacity: 12,
          feeCents: 0,
          description: DEMO_NOTE,
          createdById: ctx.userId,
          createdByLabel: ctx.userLabel,
        },
        select: { id: true },
      });
      refs.push({ model: "course", id: course.id });
      await db.courseTeacherLink.create({ data: { courseId: course.id, teacherId: teacherIds[i] } });
      for (const s of studentRows.slice(i * 3, i * 3 + 3)) {
        await db.courseEnrollment.create({
          data: {
            courseId: course.id,
            studentId: s.id,
            studentLabel: s.label ?? "",
            studentNumber: s.number ?? "",
            enrolledAt: daysFromNow(-14),
            createdById: ctx.userId,
            createdByLabel: ctx.userLabel,
          },
        });
      }
    }
    return refs;
  },
  clear: (refs) =>
    clearRefs(refs, {
      course: async (ids) => {
        const db = getDb();
        await db.courseEnrollment.deleteMany({ where: { courseId: { in: ids } } });
        await db.courseSession.deleteMany({ where: { courseId: { in: ids } } });
        await db.courseTeacherLink.deleteMany({ where: { courseId: { in: ids } } });
        await db.course.deleteMany({ where: { id: { in: ids } } });
      },
      courseTeacher: async (ids) => {
        const db = getDb();
        await db.courseTeacherLink.deleteMany({ where: { teacherId: { in: ids } } });
        await db.courseTeacher.deleteMany({ where: { id: { in: ids } } });
      },
    }),
});
