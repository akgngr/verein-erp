import { UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import {
  MEMBER_DEFAULT_SORT,
  MEMBER_SORTABLE_FIELDS,
  listMembers,
} from "../queries/list-members";
import { getMemberStats } from "../queries/get-member-stats";
import { membersPermissions } from "../permissions";
import {
  MEMBER_STATUS_FILTER_OPTIONS,
  MEMBERSHIP_TYPE_FILTER_OPTIONS,
} from "../constants";
import { berlinMonthRange } from "../utils";
import { MemberDateFilter } from "../components/list-filters";
import { MemberTable } from "../components/member-table";
import { StatsCards } from "../components/stats-cards";

/** Üye listesi: istatistik kartları + filtreler + tablo + yeni üye butonu. */
export async function MemberListView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let user;
  try {
    user = await requirePermission(membersPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const raw = await searchParams;
  const params = parseListParams(raw, {
    sortableFields: MEMBER_SORTABLE_FIELDS,
    defaultSort: MEMBER_DEFAULT_SORT,
    defaultDir: "asc",
    filterKeys: ["status", "type", "from", "to"],
  });

  const [list, stats] = await Promise.all([listMembers(params), getMemberStats()]);
  const t = await getTranslations("members");

  const canCreate = can(user.role, membersPermissions, "create");
  const canUpdate = can(user.role, membersPermissions, "update");
  const canDelete = can(user.role, membersPermissions, "delete");

  const month = berlinMonthRange();
  const monthFrom = month.start.toISOString().slice(0, 10);
  const monthTo = month.end.toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        actions={
          canCreate ? (
            <LinkButton href="/uyeler/yeni" startIcon={<UserPlus className="h-4 w-4" />}>
              {t("newMember")}
            </LinkButton>
          ) : null
        }
      />

      <StatsCards stats={stats} monthFrom={monthFrom} monthTo={monthTo} />

      <MemberTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        filters={[
          { key: "status", label: t("list.status"), options: MEMBER_STATUS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: t(`status.${o.value}`) })) },
          { key: "type", label: t("list.type"), options: MEMBERSHIP_TYPE_FILTER_OPTIONS.map((o) => ({ value: o.value, label: t(`type.${o.value}`) })) },
        ]}
        dateFilter={<MemberDateFilter />}
        searchPlaceholder={t("list.searchPlaceholder")}
        ariaLabel={t("list.aria")}
        emptyMessage={t("list.empty")}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
