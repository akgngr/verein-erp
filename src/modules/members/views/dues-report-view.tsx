import { Download } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatMoney } from "@/shared/money";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { memberPaymentsPermissions } from "../permissions";
import { MEMBERSHIP_TYPE_VALUES } from "../constants";
import { DUES_DEFAULT_SORT, DUES_SORTABLE_FIELDS, listDues } from "../queries/list-dues";
import { getDuesStats } from "../queries/get-dues-stats";
import { berlinYear } from "../utils";
import { DuesReportTable } from "../components/dues-report-table";
import { DuesYearSelect } from "../components/dues-year-select";
import { GenerateDuesModal } from "../components/generate-dues-modal";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-medium border bg-content1 px-4 py-3 shadow-sm">
      <span className="text-xl font-semibold leading-none text-foreground">{value}</span>
      <span className="text-tiny text-default-500">{label}</span>
    </div>
  );
}

/**
 * Aidat raporu (Faz 3 eklemeleri): yıllık beklenen/tahsil edilen/kalan + üye
 * bazlı satırlar. VIEWER bu sayfaya erişemez (memberPayments.view gerekir).
 */
export async function DuesReportView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let user;
  try {
    user = await requirePermission(memberPaymentsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const raw = await searchParams;
  const params = parseListParams(raw, {
    sortableFields: DUES_SORTABLE_FIELDS,
    defaultSort: DUES_DEFAULT_SORT,
    defaultDir: "asc",
    filterKeys: ["status", "type", "year"],
  });

  const currentYear = berlinYear(new Date());
  const yearRaw = Number(params.filters.year);
  const year =
    Number.isInteger(yearRaw) && yearRaw >= 2000 && yearRaw <= currentYear + 1
      ? yearRaw
      : currentYear;
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const [list, stats] = await Promise.all([listDues(params, year), getDuesStats(year)]);
  const t = await getTranslations("members.dues");

  const canCreate = can(user.role, memberPaymentsPermissions, "create");

  const statusFilterOptions = [
    { value: "OPEN", label: t("status.OPEN") },
    { value: "PARTIAL", label: t("status.PARTIAL") },
    { value: "PAID", label: t("status.PAID") },
    { value: "WAIVED", label: t("status.WAIVED") },
    { value: "OVERDUE", label: t("filterOverdue") },
  ];

  // Excel dışa aktarımı raporun aktif yıl/filtrelerini taşır.
  const exportQuery = new URLSearchParams();
  exportQuery.set("filter.year", String(year));
  if (params.filters.status) exportQuery.set("filter.status", params.filters.status);
  if (params.filters.type) exportQuery.set("filter.type", params.filters.type);

  return (
    <div>
      <PageHeader
        title={t("reportTitle", { year })}
        description={t("reportDescription")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canCreate ? <GenerateDuesModal currentYear={currentYear} /> : null}
            <LinkButton
              href={`/api/members/dues/export?${exportQuery.toString()}`}
              startIcon={<Download className="h-4 w-4" aria-hidden />}
            >
              {t("exportExcel")}
            </LinkButton>
          </div>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("stats.expected")} value={formatMoney(stats.expectedCents)} />
        <StatCard label={t("stats.collected")} value={formatMoney(stats.collectedCents)} />
        <StatCard
          label={t("stats.remaining")}
          value={formatMoney(Math.max(0, stats.remainingCents))}
        />
        <StatCard
          label={t("stats.rate")}
          value={stats.collectionRate === null ? "—" : `%${stats.collectionRate}`}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-tiny text-default-500">
        <span className="font-medium">{t("counts.title")}:</span>
        <span>
          {t("status.OPEN")}: {stats.openCount}
        </span>
        <span>·</span>
        <span>
          {t("status.PARTIAL")}: {stats.partialCount}
        </span>
        <span>·</span>
        <span>
          {t("status.PAID")}: {stats.paidCount}
        </span>
        <span>·</span>
        <span>
          {t("status.WAIVED")}: {stats.waivedCount}
        </span>
        <span>·</span>
        <span className={stats.overdueCount > 0 ? "font-medium text-danger" : undefined}>
          {t("filterOverdue")}: {stats.overdueCount}
        </span>
      </div>

      <DuesReportTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        filters={[
          { key: "status", label: t("colStatus"), options: statusFilterOptions },
          {
            key: "type",
            label: t("colType"),
            options: MEMBERSHIP_TYPE_VALUES.map((value) => ({
              value,
              label: t(`memberType.${value}`),
            })),
          },
        ]}
        toolbarExtra={<DuesYearSelect current={year} years={yearOptions} />}
        ariaLabel={t("reportTitle", { year })}
        emptyMessage={t("empty")}
        searchPlaceholder={t("searchPlaceholder")}
      />
    </div>
  );
}
