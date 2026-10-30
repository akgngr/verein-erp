import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawer, FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";
import type { RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { TeacherForm } from "../components/teacher-form";
import { TeacherTable } from "../components/teacher-table";
import { courseTeachersPermissions } from "../permissions";
import { getTeacher, listTeachers } from "../queries/course-parts";

export async function TeachersView({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(courseTeachersPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("courses");
  const raw = await searchParams;
  const canCreate = can(user.role, courseTeachersPermissions, "create");
  const canUpdate = can(user.role, courseTeachersPermissions, "update");
  const editId = canUpdate && typeof raw.duzenle === "string" ? raw.duzenle : null;
  const [rows, editing] = await Promise.all([listTeachers(), editId ? getTeacher(editId) : null]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("teachers.title")}
        description={t("teachers.description")}
        actions={
          canCreate ? (
            <FormDrawerButton param="yeni" startIcon={<Plus className="h-4 w-4" />}>
              {t("teachers.new")}
            </FormDrawerButton>
          ) : null
        }
      />
      <TeacherTable rows={rows} canUpdate={canUpdate} canInvite={canCreate} />
      {canCreate && raw.yeni !== undefined ? (
        <FormDrawer title={t("teacherForm.createTitle")} description={t("teacherForm.createDescription")}>
          <TeacherForm />
        </FormDrawer>
      ) : null}
      {editId ? (
        <FormDrawer title={t("teacherForm.editTitle")}>{editing ? <TeacherForm teacher={editing} /> : <EmptyState title={t("errors.teacherNotFound")} />}</FormDrawer>
      ) : null}
    </div>
  );
}
