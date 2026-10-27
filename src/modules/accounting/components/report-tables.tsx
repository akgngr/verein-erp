"use client";

import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { useTranslations } from "next-intl";

import type { IncomeExpenseReport, LedgerReport, ProjectReportRow } from "../types";

/** Rapor tabloları (§ 11.8): ekran; hesaplayıcı servis raporlarıyla beslenir. */

export function IncomeExpenseTable({ report }: { report: IncomeExpenseReport }) {
  const t = useTranslations("accounting.reports");
  const tBudget = useTranslations("accounting.budget");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });
  const sphereLabel = (sphere: string) =>
    tBudget(`sphere${sphere.charAt(0)}${sphere.slice(1).toLowerCase()}`);

  const rowsWithSphere = report.rows.map((row, index) => ({
    ...row,
    isFirstOfSphere: index === 0 || report.rows[index - 1].sphere !== row.sphere,
  }));
  return (
    <Table aria-label={t("tabIncomeExpense")} removeWrapper>
      <TableHeader>
        <TableColumn>{t("tabIncomeExpense")}</TableColumn>
        <TableColumn>{t("incomeExpense.colPlan")}</TableColumn>
        <TableColumn>{t("incomeExpense.colActual")}</TableColumn>
        <TableColumn>{t("incomeExpense.colPrevious")}</TableColumn>
      </TableHeader>
      <TableBody emptyContent="—">
        {rowsWithSphere.map((row) => (
            <TableRow key={`${row.categoryId}-${row.direction}`}>
              <TableCell>
                {row.isFirstOfSphere ? (
                  <span className="block text-tiny font-semibold uppercase tracking-wide text-default-400">
                    {sphereLabel(row.sphere)} — {tBudget(`direction${row.direction}`)}
                  </span>
                ) : null}
                {row.categoryName}
              </TableCell>
              <TableCell>{row.planCents ? format(row.planCents) : "—"}</TableCell>
              <TableCell>{format(row.actualCents)}</TableCell>
              <TableCell>{row.previousYearCents ? format(row.previousYearCents) : "—"}</TableCell>
            </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function LedgerTable({ report }: { report: LedgerReport }) {
  const t = useTranslations("accounting.reports.ledger");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  return (
    <Table aria-label={t("account")} removeWrapper>
      <TableHeader>
        <TableColumn>{t("colDate")}</TableColumn>
        <TableColumn>{t("colNumber")}</TableColumn>
        <TableColumn>{t("colDescription")}</TableColumn>
        <TableColumn>{t("colReceipt")}</TableColumn>
        <TableColumn>{t("colIncome")}</TableColumn>
        <TableColumn>{t("colExpense")}</TableColumn>
        <TableColumn>{t("colBalance")}</TableColumn>
      </TableHeader>
      <TableBody emptyContent="—">
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
            description: row.reversedAt ? `${row.description} (İPTAL)` : row.description,
            receipt: row.receiptReference ?? "",
            income: !row.reversedAt && row.amountCents > 0 ? format(row.amountCents) : "",
            expense:
              !row.reversedAt && row.amountCents < 0 ? format(Math.abs(row.amountCents)) : "",
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
          <TableRow key={row.id} className={row.reversed ? "opacity-50" : ""}>
            <TableCell>{row.date}</TableCell>
            <TableCell>{row.number}</TableCell>
            <TableCell>{row.description}</TableCell>
            <TableCell>{row.receipt}</TableCell>
            <TableCell className="text-success">{row.income}</TableCell>
            <TableCell className="text-danger">{row.expense}</TableCell>
            <TableCell className={row.negative ? "font-semibold text-danger" : ""}>
              {row.balance}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ProjectReportTable({ rows }: { rows: ProjectReportRow[] }) {
  const t = useTranslations("accounting.reports.projects");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });
  return (
    <Table aria-label={t("colProject")} removeWrapper>
      <TableHeader>
        <TableColumn>{t("colProject")}</TableColumn>
        <TableColumn>{t("colIncome")}</TableColumn>
        <TableColumn>{t("colExpense")}</TableColumn>
        <TableColumn>{t("colBalance")}</TableColumn>
      </TableHeader>
      <TableBody emptyContent={t("empty")}>
        {rows.map((row) => (
          <TableRow key={row.projectId}>
            <TableCell>{row.projectName}</TableCell>
            <TableCell>{format(row.incomeCents)}</TableCell>
            <TableCell>{format(row.expenseCents)}</TableCell>
            <TableCell>{format(row.balanceCents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
