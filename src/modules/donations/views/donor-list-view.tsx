import { Plus } from "lucide-react";
import { FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { DonorCreateView } from "./donor-create-view";
import { DonorEditView } from "./donor-edit-view";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { DONOR_DEFAULT_SORT, DONOR_SORTABLE_FIELDS, listDonors } from "../queries/list-donors";
import { donationsPermissions } from "../permissions";
import { DonorTable } from "../components/donor-table";

/** Bağışçı listesi (§ 15 md. 4). */
export async function DonorListView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let user;
  try {
    user = await requirePermission(donationsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const raw = await searchParams;
  const params = parseListParams(raw, {
    sortableFields: DONOR_SORTABLE_FIELDS,
    defaultSort: DONOR_DEFAULT_SORT,
    defaultDir: "asc",
    filterKeys: ["type", "active"],
  });
  const list = await listDonors(params);
  const t = await getTranslations("donations.donors");

  const canCreate = can(user.role, donationsPermissions, "create");
  const canUpdate = can(user.role, donationsPermissions, "update");

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={""}
        actions={
          canCreate ? (
            <FormDrawerButton param="yeni" startIcon={<Plus className="h-4 w-4" />}>
              {t("form.createTitle")}
            </FormDrawerButton>
          ) : null
        }
      />
      <DonorTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        canUpdate={canUpdate}
        canDelete={can(user.role, donationsPermissions, "delete")}
      />
      {canCreate && raw.yeni !== undefined ? <DonorCreateView /> : null}
      {canUpdate && typeof raw.duzenle === "string" && raw.duzenle ? <DonorEditView id={raw.duzenle} /> : null}
    </div>
  );
}
