import { Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { LinkButton } from "@/shared/components/ui/link-button";

import { listAccountOptions } from "../queries/list-accounts";
import { getIncomeExpenseReport } from "../queries/get-income-expense-report";
import { getLedgerReport } from "../queries/get-ledger";
import { getProjectReport } from "../queries/get-project-report";
import { accountingPermissions } from "../permissions";
import { IncomeExpenseTable, LedgerTable, ProjectReportTable } from "../components/report-tables";
import { ReportLedgerSelector } from "../components/report-ledger-selector";
import { AnnualPdfButton } from "../components/annual-pdf-button";

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

  const t = await getTranslations("accounting.reports");
  const accounts = await listAccountOptions();

  const effectiveAccountId = accountId ?? accounts[0]?.id ?? "";
  const effectiveFrom = from ?? `${year}-01-01`;
  const effectiveTo = to ?? `${year}-12-31`;

  const [incomeExpense, ledger, projects] = await Promise.all([
    tab === "e" ? getIncomeExpenseReport(year) : null,
    tab === "k" && effectiveAccountId
      ? getLedgerReport(effectiveAccountId, effectiveFrom, effectiveTo)
      : null,
    tab === "p" ? getProjectReport(year) : null,
  ]);

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={String(year)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {tab === "e" ? (
              <LinkButton href={`/api/accounting/reports/income-expense/export?year=${year}`} variant="bordered" startIcon={<Download className="h-4 w-4" />}>
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

      <nav className="mb-4 flex flex-wrap gap-2 text-small">
        <Link href={`/muhasebe/raporlar?sekme=e&filter.year=${year}`} className={`rounded-medium px-3 py-1.5 ${tab === "e" ? "bg-primary text-white" : "border border-default-200"}`}>
          {t("tabIncomeExpense")}
        </Link>
        <Link href={`/muhasebe/raporlar?sekme=k&filter.year=${year}`} className={`rounded-medium px-3 py-1.5 ${tab === "k" ? "bg-primary text-white" : "border border-default-200"}`}>
          {t("tabLedger")}
        </Link>
        <Link href={`/muhasebe/raporlar?sekme=p&filter.year=${year}`} className={`rounded-medium px-3 py-1.5 ${tab === "p" ? "bg-primary text-white" : "border border-default-200"}`}>
          {t("tabProjects")}
        </Link>
        <Link href={`/muhasebe/raporlar?sekme=y&filter.year=${year}`} className={`rounded-medium px-3 py-1.5 ${tab === "y" ? "bg-primary text-white" : "border border-default-200"}`}>
          {t("tabAnnual")}
        </Link>
      </nav>

      <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
        {tab === "e" && incomeExpense ? (
          <>
            <IncomeExpenseTable report={incomeExpense} />
            <p className="mt-3 font-semibold">
              {t("incomeExpense.surplus")}:{" "}
              {(
                (incomeExpense.rows.filter((row) => row.direction === "INCOME").reduce((sum, row) => sum + row.actualCents, 0) -
                  incomeExpense.rows.filter((row) => row.direction === "EXPENSE").reduce((sum, row) => sum + row.actualCents, 0)) /
                100
              ).toLocaleString("tr-TR", { style: "currency", currency: "EUR" })}
            </p>
            {incomeExpense.economicOperationNotice !== "none" ? (
              <p className={`mt-2 text-small font-medium ${incomeExpense.economicOperationNotice === "exceeded" ? "text-danger" : "text-warning"}`}>
                {incomeExpense.economicOperationNotice === "exceeded" ? t("economicExceeded") : t("economic80")}
              </p>
            ) : null}
          </>
        ) : null}

        {tab === "k" && ledger ? <LedgerTable report={ledger} /> : null}

        {tab === "p" && projects ? <ProjectReportTable rows={projects} /> : null}

        {tab === "y" ? (
          <p className="text-small text-default-500">{t("annual.description")}</p>
        ) : null}
      </div>
    </div>
  );
}
