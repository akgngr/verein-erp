import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { studentsPermissions } from "@/modules/students";
import { listStudentOptions } from "@/modules/students/server";
import { FormDrawer, FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { formatMoney } from "@/shared/money";
import { can } from "@/shared/permissions/define";
import { cn, formatDate } from "@/shared/utils";

import { ChargesTable } from "../components/charges-table";
import { CourseForm } from "../components/course-form";
import { EnrollmentsPanel } from "../components/enrollments-panel";
import { SessionsPanel } from "../components/sessions-panel";
import { courseFeesPermissions, coursesPermissions, courseSessionsPermissions } from "../permissions";
import { CHARGE_SORTABLE_FIELDS, listCharges, listEnrollments, listSessions, listTeacherOptions, type ChargeListFilterKeys } from "../queries/course-parts";
import { getCourse } from "../queries/courses";
import { canAccessCourse } from "../services/teacher-scope";
import { berlinToday, formatDateOnly } from "../utils";

const TABS = ["genel", "dersler", "ogrenciler", "ucretler"] as const;
type Tab = (typeof TABS)[number];

/** Kurs detayı: sekmeler `?sekme=` ile (genel, dersler, öğrenciler, ücretler). */
export async function CourseDetailView({ id, searchParams }: { id: string; searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(coursesPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("courses");
  const course = await getCourse(id);
  if (!course || !(await canAccessCourse(user, course.id))) notFound();

  const raw = await searchParams;
  const canSeeFees = can(user.role, courseFeesPermissions, "view");
  const visibleTabs = TABS.filter((tab) => tab !== "ucretler" || canSeeFees);
  const tab: Tab = visibleTabs.find((candidate) => candidate === raw.sekme) ?? "genel";
  const canUpdate = can(user.role, coursesPermissions, "update");
  const canEditSessions = can(user.role, courseSessionsPermissions, "update");
  const today = formatDateOnly(berlinToday());

  const facts: [string, string][] = [
    [t("form.kind"), t(`enums.kind.${course.kind}`)],
    [t("form.status"), t(`enums.status.${course.status}`)],
    [t("form.subject"), course.subject ?? "—"],
    [t("form.level"), course.level ?? "—"],
    [t("detail.period"), `${formatDate(course.startDate)}${course.endDate ? ` – ${formatDate(course.endDate)}` : ""}`],
    [t("form.scheduleNote"), course.scheduleNote ?? "—"],
    [t("form.location"), course.location ?? "—"],
    [t("form.capacity"), course.capacity ? String(course.capacity) : "—"],
    [t("form.teachers"), course.teachers.map((teacher) => teacher.name).join(", ") || "—"],
    [
      t("form.feeType"),
      course.feeType === "FREE"
        ? t("enums.feeType.FREE")
        : `${t(`enums.feeType.${course.feeType}`)} · ${formatMoney(course.feeCents)}${course.installmentCount ? ` / ${course.installmentCount}` : ""}`,
    ],
  ];

  let body: React.ReactNode = null;
  if (tab === "genel") {
    body = (
      <section className="grid grid-cols-1 gap-3 rounded-xl border border-default-200 bg-content1 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <span className="text-tiny text-default-500">{label}</span>
            <span className="text-small font-medium">{value}</span>
          </div>
        ))}
        {course.description ? <p className="whitespace-pre-line text-small sm:col-span-2 lg:col-span-3">{course.description}</p> : null}
      </section>
    );
  } else if (tab === "dersler") {
    const [sessions, teacherOptions] = await Promise.all([listSessions(course.id), canEditSessions ? listTeacherOptions() : []]);
    body = <SessionsPanel courseId={course.id} sessions={sessions} teacherOptions={teacherOptions} canEdit={canEditSessions} />;
  } else if (tab === "ogrenciler") {
    const [enrollments, studentOptions] = await Promise.all([listEnrollments(course.id), canUpdate ? listStudentOptions() : []]);
    body = (
      <EnrollmentsPanel
        courseId={course.id}
        enrollments={enrollments}
        studentOptions={studentOptions}
        canEdit={canUpdate}
        canSeeFees={canSeeFees}
        canOpenStudents={can(user.role, studentsPermissions, "view")}
        today={today}
      />
    );
  } else {
    const params = parseListParams<ChargeListFilterKeys>(raw, { sortableFields: CHARGE_SORTABLE_FIELDS, defaultSort: "dueDate", filterKeys: ["status", "overdue"] });
    params.filters.courseId = course.id;
    const charges = await listCharges(params);
    body = (
      <ChargesTable
        {...charges}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        canPay={can(user.role, courseFeesPermissions, "create")}
        canManage={can(user.role, courseFeesPermissions, "update")}
        showCourse={false}
        today={today}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${course.code} — ${course.title}`}
        description={t("detail.createdBy", { label: course.createdByLabel })}
        actions={
          canUpdate ? (
            <FormDrawerButton param="duzenle" startIcon={<Pencil className="h-4 w-4" />}>
              {t("detail.edit")}
            </FormDrawerButton>
          ) : null
        }
      />
      <nav className="flex gap-1 border-b border-default-200" aria-label={t("detail.tabs")}>
        {visibleTabs.map((key) => (
          <Link
            key={key}
            href={`/kurslar/${course.id}?sekme=${key}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-small",
              key === tab ? "border-primary font-semibold text-primary" : "border-transparent text-default-600 hover:text-foreground",
            )}
          >
            {t(`detail.tab.${key}`)}
          </Link>
        ))}
      </nav>
      {body}
      {canUpdate && raw.duzenle !== undefined ? (
        <FormDrawer title={t("form.editTitle")} description={course.code}>
          <CourseForm course={course} teacherOptions={await listTeacherOptions()} />
        </FormDrawer>
      ) : null}
    </div>
  );
}
