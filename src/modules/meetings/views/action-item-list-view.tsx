import { getTranslations } from "next-intl/server";
import { requirePermission, ForbiddenError, listActiveUserOptions } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";

import { ACTION_ITEM_DEFAULT_SORT, ACTION_ITEM_SORTABLE_FIELDS, listActionItems } from "../queries/list-action-items";
import { meetingsPermissions } from "../permissions";
import { ACTION_ITEM_STATUS_LABELS } from "../constants";
import { ActionItemTable } from "../components/action-item-table";
import { ActionItemDateFilter, ActionItemQuickFilters } from "../components/list-filters";

/**
 * Çapraz toplantı görev listesi (7.4): varsayılan görünüm yalnızca AÇIK
 * görevler (sorgu tarafında uygulanır); "Tümü" filtresi filter.status=* ile
 * tamamlananları da gösterir.
 */
export async function ActionItemListView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const tStatus = await getTranslations("meetings.actionStatus");
  const t = await getTranslations("meetings");
  let user;
  try {
    user = await requirePermission(meetingsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const raw = await searchParams;
  const params = parseListParams(raw, {
    sortableFields: ACTION_ITEM_SORTABLE_FIELDS,
    defaultSort: ACTION_ITEM_DEFAULT_SORT,
    defaultDir: "asc",
    filterKeys: ["status", "assigneeId", "mine", "overdue", "from", "to"],
  });

  const [list, userOptions] = await Promise.all([
    listActionItems(params, user.id),
    listActiveUserOptions(),
  ]);

  const canUpdate = can(user.role, meetingsPermissions, "update");

  return (
    <div>
      <PageHeader
        title={t("tasks.pageTitle")}
        description={t("tasks.listDescription")}
        actions={
          <LinkButton href="/toplantilar" color="default" variant="bordered">
            {t("pageTitle")}
          </LinkButton>
        }
      />

      <ActionItemTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        filters={[
          {
            key: "status",
            label: t("tasks.colStatus"),
            options: [
              { value: "*", label: t("filters.all") },
              ...Object.keys(ACTION_ITEM_STATUS_LABELS).map((value) => ({
                value,
                label: tStatus(value as keyof typeof ACTION_ITEM_STATUS_LABELS),
              })),
            ],
          },
          {
            key: "assigneeId",
            label: t("tasks.colAssignee"),
            options: userOptions.map((option) => ({ value: option.id, label: option.label })),
          },
        ]}
        dateFilter={<ActionItemDateFilter />}
        filterExtra={<ActionItemQuickFilters />}
        canUpdate={canUpdate}
      />
    </div>
  );
}
