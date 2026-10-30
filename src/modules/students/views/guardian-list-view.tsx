import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawer, FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { GuardianForm } from "../components/guardian-form";
import { GuardianTable } from "../components/guardian-table";
import { studentsPermissions } from "../permissions";
import { getGuardian, GUARDIAN_DEFAULT_SORT, GUARDIAN_SORTABLE_FIELDS, listGuardians } from "../queries/guardians";

export async function GuardianListView({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(studentsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("students.guardianList");
  const tForm = await getTranslations("students.guardianForm");
  const tErrors = await getTranslations("students.errors");
  const raw = await searchParams;
  const params = parseListParams(raw, { sortableFields: GUARDIAN_SORTABLE_FIELDS, defaultSort: GUARDIAN_DEFAULT_SORT });
  const list = await listGuardians(params);
  const canCreate = can(user.role, studentsPermissions, "create");
  const canUpdate = can(user.role, studentsPermissions, "update");
  const editId = canUpdate && typeof raw.duzenle === "string" ? raw.duzenle : null;
  const editing = editId ? await getGuardian(editId) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canCreate ? (
            <FormDrawerButton param="yeni" startIcon={<Plus className="h-4 w-4" />}>
              {t("new")}
            </FormDrawerButton>
          ) : null
        }
      />
      <GuardianTable
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
        <FormDrawer title={tForm("createTitle")} description={tForm("createDescription")}>
          <GuardianForm />
        </FormDrawer>
      ) : null}
      {editId ? (
        <FormDrawer title={tForm("editTitle")} description={editing ? `#${editing.debtorNumber}` : undefined}>
          {editing ? <GuardianForm guardian={editing} /> : <EmptyState title={tErrors("guardianNotFound")} />}
        </FormDrawer>
      ) : null}
    </div>
  );
}
