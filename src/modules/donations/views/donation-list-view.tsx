import { Plus } from "lucide-react";
import { FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { DonationCreateView } from "./donation-create-view";
import { DonationEditView } from "./donation-edit-view";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { berlinTodayStart } from "../utils";
import { DONATION_DEFAULT_SORT, DONATION_SORTABLE_FIELDS, listDonations } from "../queries/list-donations";
import { getDonationStats } from "../queries/get-donation-stats";
import { donationsPermissions } from "../permissions";
import { DonationStatsCards } from "../components/stats-cards";
import { DonationTable } from "../components/donation-table";

/** Bağış listesi (§ 15 md. 1). */
export async function DonationListView({
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
    sortableFields: DONATION_SORTABLE_FIELDS,
    defaultSort: DONATION_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: ["year", "method", "waived", "confirmation", "over300", "from", "to"],
  });
  const year =
    params.filters.year && /^\d{4}$/.test(params.filters.year)
      ? Number(params.filters.year)
      : berlinTodayStart().getUTCFullYear();
  const effective = { ...params, filters: { ...params.filters, year: String(year) } };

  const [list, stats] = await Promise.all([listDonations(effective), getDonationStats(year)]);
  const t = await getTranslations("donations");

  const canCreate = can(user.role, donationsPermissions, "create");
  const canUpdate = can(user.role, donationsPermissions, "update");

  return (
    <div>
      <PageHeader
        title={t("list.title")}
        description={String(year)}
        actions={
          canCreate ? (
            <FormDrawerButton param="yeni" startIcon={<Plus className="h-4 w-4" />}>
              {t("list.actions.new")}
            </FormDrawerButton>
          ) : null
        }
      />
      <DonationStatsCards stats={stats} />
      <DonationTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        year={year}
        canUpdate={canUpdate}
        canDelete={can(user.role, donationsPermissions, "delete")}
      />
      {canCreate && raw.yeni !== undefined ? <DonationCreateView /> : null}
      {canUpdate && typeof raw.duzenle === "string" && raw.duzenle ? <DonationEditView id={raw.duzenle} /> : null}
    </div>
  );
}
