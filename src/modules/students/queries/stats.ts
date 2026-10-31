import "server-only";

import { getDb } from "@/shared/db";

/** Asistan ve raporlar için yalnızca sayılar: öğrenci durumları ve veli sayısı (kişi verisi yok). */
export async function getStudentStats(): Promise<{ active: number; inactive: number; guardians: number; withSepaMandate: number }> {
  const db = getDb();
  const [active, inactive, guardians, withSepaMandate] = await Promise.all([
    db.student.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    db.student.count({ where: { deletedAt: null, status: "INACTIVE" } }),
    db.studentGuardian.count({ where: { deletedAt: null } }),
    db.studentGuardian.count({ where: { deletedAt: null, sepaMandateReference: { not: null } } }),
  ]);
  return { active, inactive, guardians, withSepaMandate };
}
