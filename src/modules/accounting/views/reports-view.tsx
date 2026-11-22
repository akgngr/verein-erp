import { Download } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";

import { AnnualPdfButton } from "../components/annual-pdf-button";
import { ReportLedgerSelector } from "../components/report-ledger-selector";
import {
  IncomeExpenseTable,
  LedgerTable,
  ProjectReportTable,
} from "../components/report-tables";
import { accountingPermissions } from "../permissions";
import { getIncomeExpenseReport } from "../queries/get-income-expense-report";
import { getLedgerReport } from "../queries/get-ledger";
import { getProjectReport } from "../queries/get-project-report";
import { listAccountOptions } from "../queries/list-accounts";
import { getTreasurerReportData } from "../queries/treasurer-report";
import { TreasurerReportSlideView } from "./treasurer-report-slide-view";

/**
 * Raporlar (§ 11.8): ?sekme=e|k|p|y + filter.year + account/from/to.
 * Ekran, Excel ve PDF TEK hesaplayıcı servisten beslenir.
 */
export async function ReportsView({
  tab,
  year,
  accountId,
  from,
  to,
}: {
  tab: "e" | "k" | "p" | "y";
  year: number;
  accountId: string | null;
  from: string;
  to: string;
}) {
  try {
    await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const [t, rawLocale] = await Promise.all([
    getTranslations("accounting.reports"),
    getLocale(),
  ]);
  const locale = (rawLocale === "de" ? "de" : "tr") as "tr" | "de";

  const accounts = await listAccountOptions();

  const effectiveAccountId = accountId ?? accounts[0]?.id ?? "";
  const effectiveFrom = from ?? `${year}-01-01`;
  const effectiveTo = to ?? `${year}-12-31`;

  const [incomeExpense, ledger, projects, treasurerReport] = await Promise.all([
    tab === "e" ? getIncomeExpenseReport(year) : null,
    tab === "k" && effectiveAccountId
      ? getLedgerReport(effectiveAccountId, effectiveFrom, effectiveTo)
      : null,
    tab === "p" ? getProjectReport(year) : null,
    tab === "y" ? getTreasurerReportData(year) : null,
  ]);

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={String(year)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {tab === "e" ? (
              <LinkButton
                href={`/api/accounting/reports/income-expense/export?year=${year}`}
                variant="bordered"
                startIcon={<Download className="h-4 w-4" />}
              >
                {t("incomeExpense.exportExcel")}
              </LinkButton>
            ) : null}
            {tab === "k" ? (
              <>
                <LinkButton
                  href={`/api/accounting/reports/ledger/export?account=${effectiveAccountId}&from=${effectiveFrom}&to=${effectiveTo}`}
                  variant="bordered"
                  startIcon={<Download className="h-4 w-4" />}
                >
                  {t("ledger.exportExcel")}
                </LinkButton>
                <ReportLedgerSelector
                  accountId={effectiveAccountId}
                  from={effectiveFrom}
                  to={effectiveTo}
                />
              </>
            ) : null}
            {tab === "y" ? (
              <AnnualPdfButton year={year} label={t("annual.pdf")} />
            ) : null}
          </div>
        }
      />

      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link
          href={`/muhasebe/raporlar?sekme=e&filter.year=${year}`}
          className={`rounded-lg px-3 py-1.5 ${tab === "e" ? "bg-accent text-white" : "border border-ink-200"}`}
        >
          {t("tabIncomeExpense")}
        </Link>
        <Link
          href={`/muhasebe/raporlar?sekme=k&filter.year=${year}`}
          className={`rounded-lg px-3 py-1.5 ${tab === "k" ? "bg-accent text-white" : "border border-ink-200"}`}
        >
          {t("tabLedger")}
        </Link>
        <Link
          href={`/muhasebe/raporlar?sekme=p&filter.year=${year}`}
          className={`rounded-lg px-3 py-1.5 ${tab === "p" ? "bg-accent text-white" : "border border-ink-200"}`}
        >
          {t("tabProjects")}
        </Link>
        <Link
          href={`/muhasebe/raporlar?sekme=y&filter.year=${year}`}
          className={`rounded-lg px-3 py-1.5 ${tab === "y" ? "bg-accent text-white" : "border border-ink-200"}`}
        >
          {t("tabAnnual")}
        </Link>
      </nav>

      <div className="rounded-lg border border-ink-200 bg-surface p-5 shadow-sm">
        {tab === "e" && incomeExpense ? (
          <>
            <IncomeExpenseTable report={incomeExpense} />
            <p className="mt-3 font-semibold">
              {t("incomeExpense.surplus")}:{" "}
              {(
                (incomeExpense.rows
                  .filter((row) => row.direction === "INCOME")
                  .reduce((sum, row) => sum + row.actualCents, 0) -
                  incomeExpense.rows
                    .filter((row) => row.direction === "EXPENSE")
                    .reduce((sum, row) => sum + row.actualCents, 0)) /
                100
              ).toLocaleString("tr-TR", { style: "currency", currency: "EUR" })}
            </p>
            {incomeExpense.economicOperationNotice !== "none" ? (
              <p
                className={`mt-2 text-sm font-medium ${incomeExpense.economicOperationNotice === "exceeded" ? "text-danger" : "text-warning"}`}
              >
                {incomeExpense.economicOperationNotice === "exceeded"
                  ? t("economicExceeded")
                  : t("economic80")}
              </p>
            ) : null}
          </>
        ) : null}

        {tab === "k" && ledger ? <LedgerTable report={ledger} /> : null}

        {tab === "p" && projects ? (
          <ProjectReportTable rows={projects} />
        ) : null}

        {tab === "y" && treasurerReport ? (
          <TreasurerReportSlideView report={treasurerReport} lang={locale} />
        ) : null}
      </div>
    </div>
  );
}
