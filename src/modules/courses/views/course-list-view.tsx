import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawer, FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { CourseForm } from "../components/course-form";
import { CourseTable } from "../components/course-table";
import { coursesPermissions } from "../permissions";
import { listTeacherOptions } from "../queries/course-parts";
import { COURSE_DEFAULT_SORT, COURSE_SORTABLE_FIELDS, getCourse, listCourses, type CourseListFilterKeys } from "../queries/courses";
import { teacherCourseScope } from "../services/teacher-scope";

export async function CourseListView({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(coursesPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("courses");
  const raw = await searchParams;
  const params = parseListParams<CourseListFilterKeys>(raw, {
    sortableFields: COURSE_SORTABLE_FIELDS,
    defaultSort: COURSE_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: ["status", "kind"],
  });
  const scope = await teacherCourseScope(user);
  const list = await listCourses(params, scope);
  const canCreate = can(user.role, coursesPermissions, "create");
  const canUpdate = can(user.role, coursesPermissions, "update");
  const editId = canUpdate && typeof raw.duzenle === "string" ? raw.duzenle : null;
  const needsForm = (canCreate && raw.yeni !== undefined) || editId !== null;
  const [teacherOptions, editing] = await Promise.all([needsForm ? listTeacherOptions() : [], editId ? getCourse(editId) : null]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={scope ? t("myTitle") : t("title")}
        description={scope ? t("myDescription") : t("description")}
        actions={
          canCreate ? (
            <FormDrawerButton param="yeni" startIcon={<Plus className="h-4 w-4" />}>
              {t("newCourse")}
            </FormDrawerButton>
          ) : null
        }
      />
      <CourseTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        canUpdate={canUpdate}
        canDelete={can(user.role, coursesPermissions, "delete")}
      />
      {canCreate && raw.yeni !== undefined ? (
        <FormDrawer title={t("form.createTitle")} description={t("form.createDescription")}>
          <CourseForm teacherOptions={teacherOptions} />
        </FormDrawer>
      ) : null}
      {editId ? (
        <FormDrawer title={t("form.editTitle")} description={editing?.code}>
          {editing ? <CourseForm course={editing} teacherOptions={teacherOptions} /> : <EmptyState title={t("errors.notFound")} />}
        </FormDrawer>
      ) : null}
    </div>
  );
}
