import "server-only";

import { getDb } from "@/shared/db";

import { getUserProfiles } from "@/modules/auth/server";

import { splitUserName } from "../utils";

/**
 * Hesabı olan öğretmenlerin ad ve e-postası kullanıcı kaydından gelir (tek doğruluk kaynağı).
 * Kullanıcılar modülünde yapılan değişiklik, kurs ekranları okunurken buraya yansıtılır.
 */
export async function syncLinkedTeachers(): Promise<void> {
  const db = getDb();
  const linked = await db.courseTeacher.findMany({
    where: { userId: { not: null } },
    select: { id: true, userId: true, firstName: true, lastName: true, email: true },
  });
  if (linked.length === 0) return;
  const profiles = new Map((await getUserProfiles(linked.map((row) => row.userId as string))).map((profile) => [profile.id, profile]));

  for (const teacher of linked) {
    const profile = profiles.get(teacher.userId as string);
    if (!profile) continue;
    const { firstName, lastName } = splitUserName(profile.name);
    if (teacher.firstName === firstName && teacher.lastName === lastName && teacher.email === profile.email) continue;
    await db.courseTeacher.update({ where: { id: teacher.id }, data: { firstName, lastName, email: profile.email } });
  }
}
