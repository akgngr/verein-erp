import { Download, FolderTree, Inbox, Send } from "lucide-react";

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
import { documentCategoriesPermissions, documentsPermissions } from "../permissions";
import { STATUS_FILTER_OPTIONS } from "../constants";
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
  const canSeeCategories = can(user.role, documentCategoriesPermissions, "view");

  // "Excel'e aktar" mevcut filtrelerle aynı sonucu vermeli (10. bölüm).
  const exportQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (
      single &&
      (key === "q" || key === "sort" || key === "dir" || key.startsWith("filter."))
    ) {
      exportQuery.set(key, single);
    }
  }
  const exportHref = `/api/documents/export${exportQuery.size > 0 ? `?${exportQuery.toString()}` : ""}`;

  const month = berlinMonthRange();
  const monthFrom = month.start.toISOString().slice(0, 10);
  const monthTo = month.end.toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Evrak Kayıt"
        description="Gelen ve giden evrakların kaydı, numaralandırılması ve takibi."
        actions={
          <>
            {canCreate ? (
              <>
                <LinkButton href="/evrak/yeni?yon=gelen" startIcon={<Inbox className="h-4 w-4" />}>
                  Yeni gelen evrak
                </LinkButton>
                <LinkButton href="/evrak/yeni?yon=giden" startIcon={<Send className="h-4 w-4" />}>
                  Yeni giden evrak
                </LinkButton>
              </>
            ) : null}
            <LinkButton
              href={exportHref}
              color="default"
              variant="bordered"
              startIcon={<Download className="h-4 w-4" />}
            >
              Excel&apos;e aktar
            </LinkButton>
            {canSeeCategories ? (
              <LinkButton
                href="/evrak/kategoriler"
                color="default"
                variant="light"
                startIcon={<FolderTree className="h-4 w-4" />}
              >
                Kategoriler
              </LinkButton>
            ) : null}
          </>
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
          { key: "status", label: "Durum", options: [...STATUS_FILTER_OPTIONS] },
          { key: "categoryId", label: "Kategori", options: categories.map((c) => ({ value: c.id, label: c.label })) },
          { key: "assigneeId", label: "Sorumlu", options: assignees.map((a) => ({ value: a.id, label: a.label })) },
        ]}
        canUpdate={can(user.role, documentsPermissions, "update")}
        canDelete={canDelete}
      />
    </div>
  );
}
