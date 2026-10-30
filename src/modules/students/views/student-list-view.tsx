import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawer, FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { StudentForm } from "../components/student-form";
import { StudentTable } from "../components/student-table";
import { studentsPermissions } from "../permissions";
import { getStudent, listStudents, STUDENT_DEFAULT_SORT, STUDENT_SORTABLE_FIELDS, type StudentListFilterKeys } from "../queries/students";

/** Öğrenci listesi; `?yeni` / `?duzenle=<id>` sağ çekmecede form açar. */
export async function StudentListView({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(studentsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("students");
  const raw = await searchParams;
  const params = parseListParams<StudentListFilterKeys>(raw, {
    sortableFields: STUDENT_SORTABLE_FIELDS,
    defaultSort: STUDENT_DEFAULT_SORT,
    filterKeys: ["status"],
  });
  const list = await listStudents(params);
  const canCreate = can(user.role, studentsPermissions, "create");
  const canUpdate = can(user.role, studentsPermissions, "update");
  const editId = canUpdate && typeof raw.duzenle === "string" ? raw.duzenle : null;
  const editing = editId ? await getStudent(editId) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canCreate ? (
            <FormDrawerButton param="yeni" startIcon={<Plus className="h-4 w-4" />}>
              {t("newStudent")}
            </FormDrawerButton>
          ) : null
        }
      />
      <StudentTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        canUpdate={canUpdate}
        canDelete={can(user.role, studentsPermissions, "delete")}
      />
      {canCreate && raw.yeni !== undefined ? (
        <FormDrawer title={t("form.createTitle")} description={t("form.createDescription")}>
          <StudentForm />
        </FormDrawer>
      ) : null}
      {editId ? (
        <FormDrawer title={t("form.editTitle")} description={editing?.studentNumber}>
          {editing ? <StudentForm student={editing} /> : <EmptyState title={t("errors.notFound")} />}
        </FormDrawer>
      ) : null}
    </div>
  );
}
