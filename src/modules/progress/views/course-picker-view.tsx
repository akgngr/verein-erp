import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { listCourseOptions, teacherCourseScope } from "@/modules/courses/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { progressPermissions } from "../permissions";

/** Öğrenci takibi girişi: (öğretmen için yalnızca kendi) kurslar. */
export async function CoursePickerView() {
  let user;
  try {
    user = await requirePermission(progressPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("progress");
  const tStatus = await getTranslations("courses.enums.status");
  const courses = await listCourseOptions(await teacherCourseScope(user));
  const groups = (["ACTIVE", "PLANNED", "COMPLETED", "CANCELLED"] as const)
    .map((status) => ({ status, items: courses.filter((course) => course.status === status) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {groups.length === 0 ? <p className="text-small text-default-500">{t("noCourses")}</p> : null}
      {groups.map((group) => (
        <section key={group.status} className="flex flex-col gap-2">
          <h2 className="text-small font-semibold uppercase tracking-wider text-default-500">{tStatus(group.status)}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((course) => (
              <Link
                key={course.id}
                href={`/ogrenci-takibi/${course.id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-default-200 bg-content1 p-4 shadow-xs transition-all hover:border-primary-300 hover:shadow-md"
              >
                <span className="text-small font-medium group-hover:text-primary">{course.label}</span>
                <ChevronRight className="h-4 w-4 text-default-300 group-hover:text-primary" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
