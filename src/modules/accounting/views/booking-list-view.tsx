import { Landmark, PiggyBank, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import {
  BOOKING_DEFAULT_SORT,
  BOOKING_SORTABLE_FIELDS,
  listBookings,
} from "../queries/list-bookings";
import { getAccountingStats } from "../queries/get-accounting-stats";
import { listAccountBalances, listAccountOptions } from "../queries/list-accounts";
import { listCategoryOptions } from "../queries/list-categories";
import { listProjectOptions } from "../queries/list-projects";
import { listYearsWithBookings } from "../queries/list-years";
import { accountingPermissions } from "../permissions";
import { berlinToday } from "../utils";
import { AccountBalanceChips } from "../components/account-balance-chips";
import { BookingTable } from "../components/booking-table";
import { StatsCards } from "../components/stats-cards";

/** Fiş listesi (§ 11.1): yıl + istatistik + bakiye çipleri + tablo. */
export async function AccountingListView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let user;
  try {
    user = await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const raw = await searchParams;
  const params = parseListParams(raw, {
    sortableFields: BOOKING_SORTABLE_FIELDS,
    defaultSort: BOOKING_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: [
      "year",
      "type",
      "accountId",
      "categoryId",
      "sphere",
      "projectId",
      "missingReceipt",
      "source",
      "includeReversed",
      "from",
      "to",
    ],
  });

  const currentYear = berlinToday().getUTCFullYear();
  const yearFilter =
    params.filters.year && /^\d{4}$/.test(params.filters.year)
      ? Number(params.filters.year)
      : currentYear;
  const effectiveParams = { ...params, filters: { ...params.filters, year: String(yearFilter) } };

  const [list, stats, balances, accounts, categories, projects, years] = await Promise.all([
    listBookings(effectiveParams),
    getAccountingStats(yearFilter),
    listAccountBalances(),
    listAccountOptions(),
    listCategoryOptions(),
    listProjectOptions(),
    listYearsWithBookings(),
  ]);
  const t = await getTranslations("accounting");
  const tBudget = await getTranslations("accounting.budget");
  const tForm = await getTranslations("accounting.form");

  const canCreate = can(user.role, accountingPermissions, "create");
  const canUpdate = can(user.role, accountingPermissions, "update");
  const canDelete = can(user.role, accountingPermissions, "delete");

  const locked = years.find((row) => row.year === yearFilter)?.lockedAt ?? null;

  // Yıl seçenekleri: fişi olan yıllar + geçerli yıl.
  const yearOptions = [
    ...new Set([...years.map((row) => String(row.year)), String(currentYear)]),
  ]
    .sort()
    .reverse()
    .map((year) => ({ value: year, label: year }));

  const sphereLabel = (sphere: string) => {
    const rawKey = `sphere${sphere}`;
    if (tBudget.has(rawKey)) return tBudget(rawKey);
    const camel = `sphere${sphere.charAt(0)}${sphere.slice(1).toLowerCase()}`;
    if (tBudget.has(camel)) return tBudget(camel);
    return sphere;
  };

  return (
    <div>
      <PageHeader
        title={t("list.title")}
        description={String(yearFilter)}
        actions={
          canCreate ? (
            <div className="flex flex-wrap items-center gap-2">
              <LinkButton href="/muhasebe/yeni?tur=gelir" startIcon={<PiggyBank className="h-4 w-4" />}>
                {t("list.actions.newIncome")}
              </LinkButton>
              <LinkButton href="/muhasebe/yeni?tur=gider" color="secondary" startIcon={<Wallet className="h-4 w-4" />}>
                {t("list.actions.newExpense")}
              </LinkButton>
              <LinkButton href="/muhasebe/yeni?tur=virman" color="default" variant="bordered" startIcon={<Landmark className="h-4 w-4" />}>
                {t("list.actions.newTransfer")}
              </LinkButton>
            </div>
          ) : null
        }
      />

      {locked ? (
        <div className="mb-4 rounded-medium border border-warning-300 bg-warning-50 px-4 py-2 text-small text-warning-700">
          {t("list.yearLocked", { year: yearFilter })}
        </div>
      ) : null}

      <StatsCards
        incomeCents={stats.incomeCents}
        expenseCents={stats.expenseCents}
        missingReceiptCount={stats.missingReceiptCount}
      />
      <AccountBalanceChips balances={balances} />

      <BookingTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        searchPlaceholder={t("list.filters.q")}
        filters={[
          { key: "year", label: t("list.columns.date") + " (yıl)", options: yearOptions },
          {
            key: "type",
            label: t("list.filters.type"),
            options: [
              { value: "INCOME", label: tForm("typeIncome") },
              { value: "EXPENSE", label: tForm("typeExpense") },
              { value: "TRANSFER", label: tForm("typeTransfer") },
            ],
          },
          { key: "accountId", label: t("list.filters.account"), options: accounts.map((account) => ({ value: account.id, label: account.name })) },
          { key: "categoryId", label: t("list.filters.category"), options: categories.map((category) => ({ value: category.id, label: category.name })) },
          {
            key: "sphere",
            label: t("list.filters.sphere"),
            options: [
              { value: "IDEELL", label: sphereLabel("IDEELL") },
              { value: "ASSET_MANAGEMENT", label: sphereLabel("ASSET_MANAGEMENT") },
              { value: "PURPOSE_OPERATION", label: sphereLabel("PURPOSE_OPERATION") },
              { value: "ECONOMIC_OPERATION", label: sphereLabel("ECONOMIC_OPERATION") },
            ],
          },
          { key: "projectId", label: t("list.filters.project"), options: projects.map((project) => ({ value: project.id, label: project.name })) },
          { key: "missingReceipt", label: t("list.filters.missingReceipt"), options: [{ value: "1", label: t("list.filters.missingReceipt") }] },
          {
            key: "source",
            label: t("list.filters.source"),
            options: [
              { value: "manual", label: t("list.filters.sourceManual") },
              { value: "member", label: t("list.filters.sourceMember") },
            ],
          },
          { key: "includeReversed", label: t("list.filters.hideReversed"), options: [{ value: "hide", label: t("list.filters.hideReversed") }] },
        ]}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
