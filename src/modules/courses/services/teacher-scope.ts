import "server-only";

import type { Role } from "@/shared/roles";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { coursesAllPermissions } from "../permissions";

/**
 * Kurs kapsamı: "Tüm kurslar" izni (coursesAll:view) olmayan kullanıcı yalnızca öğretmeni
 * olduğu kursları görür (rol adına değil izne bakılır; özel roller de böyle çalışır).
 * Dönen değer null ise kullanıcı tüm kursları görebilir; dizi ise yalnızca o kurs kimliklerini.
 */
export async function teacherCourseScope(user: { id: string; role: Role }): Promise<string[] | null> {
  if (can(user.role, coursesAllPermissions, "view")) return null;
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
