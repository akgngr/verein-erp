import "server-only";

import type { Role } from "@prisma/client";

import { ActionError } from "@/modules/auth/server";
import { canAccessCourse, getCourseRoster } from "@/modules/courses/server";

/** Kurs erişimi (öğretmen kapsamı dahil) + kurs listesi; erişim yoksa "bulunamadı". */
export async function loadRosterFor(user: { id: string; role: Role }, courseId: string) {
  if (!(await canAccessCourse(user, courseId))) throw new ActionError("progress.errors.courseNotFound");
  const roster = await getCourseRoster(courseId);
  if (!roster) throw new ActionError("progress.errors.courseNotFound");
  return roster;
}
