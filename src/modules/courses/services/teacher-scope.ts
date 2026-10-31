import "server-only";

import type { Role } from "@/shared/roles";

import { getDb } from "@/shared/db";

/**
 * Öğretmen kapsamı: TEACHER rolündeki kullanıcı yalnızca bağlı olduğu kursları görür.
 * Dönen değer null ise kullanıcı tüm kursları görebilir; dizi ise yalnızca o kurs kimliklerini.
 */
export async function teacherCourseScope(user: { id: string; role: Role }): Promise<string[] | null> {
  if (user.role !== "TEACHER") return null;
  const teacher = await getDb().courseTeacher.findUnique({
    where: { userId: user.id },
    select: { courses: { select: { courseId: true } } },
  });
  return teacher?.courses.map((link) => link.courseId) ?? [];
}

export async function canAccessCourse(user: { id: string; role: Role }, courseId: string): Promise<boolean> {
  const scope = await teacherCourseScope(user);
  return scope === null || scope.includes(courseId);
}
