"use client";
import { Table } from "@/shared/components/kit";

import { useTranslations } from "next-intl";

import type {
  IncomeExpenseReport,
  LedgerReport,
  ProjectReportRow,
} from "../types";

/** Rapor tabloları (§ 11.8): ekran; hesaplayıcı servis raporlarıyla beslenir. */

export function IncomeExpenseTable({
  report,
}: {
  report: IncomeExpenseReport;
}) {
  const t = useTranslations("accounting.reports");
  const tBudget = useTranslations("accounting.budget");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: "EUR",
    });
  const sphereLabel = (sphere: string) => {
    const rawKey = `sphere${sphere}`;
    if (tBudget.has(rawKey)) return tBudget(rawKey);
    const camel = `sphere${sphere.charAt(0)}${sphere.slice(1).toLowerCase()}`;
    if (tBudget.has(camel)) return tBudget(camel);
    return sphere;
  };

  const rowsWithSphere = report.rows.map((row, index) => ({
    ...row,
    isFirstOfSphere:
      index === 0 || report.rows[index - 1].sphere !== row.sphere,
  }));
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label={t("tabIncomeExpense")}>
          <Table.Header>
            <Table.Column isRowHeader id={"column-0"}>
              {t("tabIncomeExpense")}
            </Table.Column>
            <Table.Column id={"column-1"}>
              {t("incomeExpense.colPlan")}
            </Table.Column>
            <Table.Column id={"column-2"}>
              {t("incomeExpense.colActual")}
            </Table.Column>
            <Table.Column id={"column-3"}>
              {t("incomeExpense.colPrevious")}
            </Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={() => "—"}>
            {rowsWithSphere.map((row) => (
              <Table.Row
                key={`${row.categoryId}-${row.direction}`}
                id={`${row.categoryId}-${row.direction}`}
              >
                <Table.Cell>
                  {row.isFirstOfSphere ? (
                    <span className="block text-xs font-semibold uppercase tracking-wide text-ink-400">
                      {sphereLabel(row.sphere)} —{" "}
                      {tBudget(`direction${row.direction}`)}
                    </span>
                  ) : null}
                  {row.categoryName}
                </Table.Cell>
                <Table.Cell>
                  {row.planCents ? format(row.planCents) : "—"}
                </Table.Cell>
                <Table.Cell>{format(row.actualCents)}</Table.Cell>
                <Table.Cell>
                  {row.previousYearCents ? format(row.previousYearCents) : "—"}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

export function LedgerTable({ report }: { report: LedgerReport }) {
  const tReports = useTranslations("accounting.reports");
  const t = useTranslations("accounting.reports.ledger");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: "EUR",
    });

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label={t("account")}>
          <Table.Header>
            <Table.Column isRowHeader id={"column-0"}>
              {t("colDate")}
            </Table.Column>
            <Table.Column id={"column-1"}>{t("colNumber")}</Table.Column>
            <Table.Column id={"column-2"}>{t("colDescription")}</Table.Column>
            <Table.Column id={"column-3"}>{t("colReceipt")}</Table.Column>
            <Table.Column id={"column-4"}>{t("colIncome")}</Table.Column>
            <Table.Column id={"column-5"}>{t("colExpense")}</Table.Column>
            <Table.Column id={"column-6"}>{t("colBalance")}</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={() => "—"}>
            {[
              {
                id: "opening",
                date: "",
                number: "",
                description: t("opening"),
                receipt: "",
                income: "",
                expense: "",
                balance: format(report.openingBalanceCents),
                reversed: false,
                negative: report.openingBalanceCents < 0,
              },
              ...report.rows.map((row) => ({
                id: row.id,
                date: row.bookingDate.toISOString().slice(0, 10),
                number: row.bookingNumber,
                description: row.reversedAt
                  ? tReports("reversedSuffix", { description: row.description })
                  : row.description,
                receipt: row.receiptReference ?? "",
                income:
                  !row.reversedAt && row.amountCents > 0
                    ? format(row.amountCents)
                    : "",
                expense:
                  !row.reversedAt && row.amountCents < 0
                    ? format(Math.abs(row.amountCents))
                    : "",
                balance: format(row.runningBalanceCents),
                reversed: Boolean(row.reversedAt),
                negative: row.runningBalanceCents < 0,
              })),
              {
                id: "closing",
                date: "",
                number: "",
                description: t("closing"),
                receipt: "",
                income: "",
                expense: "",
                balance: format(report.closingBalanceCents),
                reversed: false,
                negative: report.closingBalanceCents < 0,
              },
            ].map((row) => (
              <Table.Row
                key={row.id}
                className={row.reversed ? "opacity-50" : ""}
                id={row.id}
              >
                <Table.Cell>{row.date}</Table.Cell>
                <Table.Cell>{row.number}</Table.Cell>
                <Table.Cell>{row.description}</Table.Cell>
                <Table.Cell>{row.receipt}</Table.Cell>
                <Table.Cell className="text-success">{row.income}</Table.Cell>
                <Table.Cell className="text-danger">{row.expense}</Table.Cell>
                <Table.Cell
                  className={row.negative ? "font-semibold text-danger" : ""}
                >
                  {row.balance}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

export function ProjectReportTable({ rows }: { rows: ProjectReportRow[] }) {
  const t = useTranslations("accounting.reports.projects");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: "EUR",
    });
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label={t("colProject")}>
          <Table.Header>
            <Table.Column isRowHeader id={"column-0"}>
              {t("colProject")}
            </Table.Column>
            <Table.Column id={"column-1"}>{t("colIncome")}</Table.Column>
            <Table.Column id={"column-2"}>{t("colExpense")}</Table.Column>
            <Table.Column id={"column-3"}>{t("colBalance")}</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={() => t("empty")}>
            {rows.map((row) => (
              <Table.Row key={row.projectId} id={row.projectId}>
                <Table.Cell>{row.projectName}</Table.Cell>
                <Table.Cell>{format(row.incomeCents)}</Table.Cell>
                <Table.Cell>{format(row.expenseCents)}</Table.Cell>
                <Table.Cell>{format(row.balanceCents)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
