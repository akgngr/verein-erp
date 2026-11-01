import "server-only";

import { getDb } from "@/shared/db";
import { DEMO_BIC, DEMO_IBAN, DEMO_NOTE, clearRefs, defineDemo, demoPerson } from "@/shared/demo/define";

import { DEBTOR_NUMBER_MIN, STUDENT_NUMBER_PREFIX } from "./constants";

/** 30 kurgusal öğrenci + 30 veli (örnek IBAN, example.com). Öğrenci sırası 9001'den başlar. */
export const demo = defineDemo({
  moduleKey: "students",
  order: 20,
  async seed(ctx) {
    const db = getDb();
    const year = new Date().getUTCFullYear();
    const last = await db.studentGuardian.findFirst({ orderBy: { debtorNumber: "desc" }, select: { debtorNumber: true } });
    let debtorNumber = Math.max(last?.debtorNumber ?? 0, DEBTOR_NUMBER_MIN - 1);
    const refs = ctx.refs;
    const grades = ["5", "6", "7", "8", "9", "10", "11", "12"];
    for (let i = 0; i < 30; i++) {
      const parent = demoPerson(i + 100);
      const child = demoPerson(i + 200);
      debtorNumber += 1;
      const guardian = await db.studentGuardian.create({
        data: {
          debtorNumber,
          salutation: i % 2 === 0 ? "Frau" : "Herr",
          firstName: parent.firstName,
          lastName: parent.lastName,
          street: parent.street,
          houseNumber: parent.houseNumber,
          postalCode: parent.postalCode,
          city: parent.city,
          email: parent.email,
          phone: parent.phone,
          iban: DEMO_IBAN,
          bic: DEMO_BIC,
          accountHolder: `${parent.firstName} ${parent.lastName}`,
          note: DEMO_NOTE,
          createdById: ctx.userId,
          createdByLabel: ctx.userLabel,
        },
        select: { id: true },
      });
      refs.push({ model: "studentGuardian", id: guardian.id });
      const sequence = 9001 + i;
      const student = await db.student.create({
        data: {
          year,
          sequence,
          studentNumber: `${STUDENT_NUMBER_PREFIX}-${year}-${sequence}`,
          firstName: child.firstName,
          lastName: parent.lastName,
          birthDate: new Date(Date.UTC(2008 + (i % 10), i % 12, (i % 27) + 1)),
          school: i % 2 === 0 ? "Demo-Gymnasium" : "Beispiel-Realschule",
          gradeLevel: grades[i % grades.length],
          photoConsent: false,
          note: DEMO_NOTE,
          createdById: ctx.userId,
          createdByLabel: ctx.userLabel,
        },
        select: { id: true, studentNumber: true },
      });
      refs.push({ model: "student", id: student.id, label: `${child.firstName} ${parent.lastName}`, number: student.studentNumber });
      await db.studentGuardianLink.create({ data: { studentId: student.id, guardianId: guardian.id, relation: i % 2 === 0 ? "MOTHER" : "FATHER" } });
    }
    return refs;
  },
  clear: (refs) =>
    clearRefs(refs, {
      // clearRefs modelleri ters sırada siler: önce öğrenciler (bağlantılarla), sonra veliler.
      student: async (ids) => {
        const db = getDb();
        await db.studentGuardianLink.deleteMany({ where: { studentId: { in: ids } } });
        await db.student.deleteMany({ where: { id: { in: ids } } });
      },
      studentGuardian: async (ids) => {
        const db = getDb();
        await db.studentGuardianLink.deleteMany({ where: { guardianId: { in: ids } } });
        await db.studentGuardian.deleteMany({ where: { id: { in: ids } } });
      },
    }),
});
