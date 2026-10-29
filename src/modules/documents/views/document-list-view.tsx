import { Inbox, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, listActiveUserOptions, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";

import { getDocumentStats } from "../queries/get-document-stats";
import { listActiveCategoryOptions } from "../queries/list-categories";
import {
  DOCUMENT_DEFAULT_SORT,
  DOCUMENT_SORTABLE_FIELDS,
  listDocuments,
} from "../queries/list-documents";
import { documentsPermissions } from "../permissions";
import { STATUS_VALUES } from "../constants";
import { berlinMonthRange } from "../utils";
import { DirectionTabs, DocumentDateFilter, DocumentQuickFilters } from "../components/list-filters";
import { DocumentTable } from "../components/document-table";
import { StatsCards } from "../components/stats-cards";

/** Evrak listesi (8.1): istatistik kartları + yön sekmeleri + filtreler + tablo. */
export async function DocumentListView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let user;
  try {
    user = await requirePermission(documentsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("documents");
  const raw = await searchParams;
  const params = parseListParams(raw, {
    sortableFields: DOCUMENT_SORTABLE_FIELDS,
    defaultSort: DOCUMENT_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: [
      "direction",
      "status",
      "categoryId",
      "assigneeId",
      "from",
      "to",
      "mine",
      "overdue",
    ],
  });

  const [list, stats, categories, assignees] = await Promise.all([
    listDocuments(params, user.id),
    getDocumentStats(),
    listActiveCategoryOptions(),
    listActiveUserOptions(),
  ]);

  const canCreate = can(user.role, documentsPermissions, "create");
  const canDelete = can(user.role, documentsPermissions, "delete");

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
            <div className="flex flex-wrap items-center gap-2">
              <LinkButton href="/evrak/yeni?yon=gelen" startIcon={<Inbox className="h-4 w-4" />}>
                {t("newIncoming")}
              </LinkButton>
              <LinkButton href="/evrak/yeni?yon=giden" startIcon={<Send className="h-4 w-4" />}>
                {t("newOutgoing")}
              </LinkButton>
            </div>
          ) : null
        }
      />

      <StatsCards stats={stats} monthFrom={monthFrom} monthTo={monthTo} />

      <DocumentTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        topRightExtra={<DirectionTabs />}
        dateFilter={<DocumentDateFilter />}
        filterExtra={<DocumentQuickFilters />}
        filters={[
          { key: "status", label: t("filter.status"), options: STATUS_VALUES.map((value) => ({ value, label: t(`status.${value}`) })) },
          { key: "categoryId", label: t("filter.category"), options: categories.map((c) => ({ value: c.id, label: c.label })) },
          { key: "assigneeId", label: t("filter.assignee"), options: assignees.map((a) => ({ value: a.id, label: a.label })) },
        ]}
        canUpdate={can(user.role, documentsPermissions, "update")}
        canDelete={canDelete}
      />
    </div>
  );
}
