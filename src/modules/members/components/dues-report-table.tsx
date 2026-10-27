"use client";

import { Link } from "@heroui/react";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableFilter, DataTableRowAction } from "@/shared/components/data-table/types";
import { formatMoney } from "@/shared/money";
import { formatDate } from "@/shared/utils";

import type { DuesReportRow } from "../types";
import { DuesStatusBadge } from "./dues-status-badge";
import { TypeBadge } from "./type-badge";

/**
 * Aidat raporu tablosu. KARAR: "Ödenen" sıralanabilir değildir — ödenen tutar
 * denormalize edilmediğinden DB sıralaması yoktur (bkz. list-dues karar notu).
 */
export function DuesReportTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  filters,
  toolbarExtra,
  ariaLabel,
  emptyMessage,
  searchPlaceholder,
}: {
  rows: DuesReportRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  filters?: DataTableFilter[];
  toolbarExtra?: React.ReactNode;
  ariaLabel: string;
  emptyMessage: string;
  searchPlaceholder?: string;
}) {
  const t = useTranslations("members.dues");

  const columns = [
    {
      key: "membershipNumber",
      label: t("colMemberNumber"),
      sortable: true,
      width: 140,
      render: (row: DuesReportRow) => (
        <Link href={`/uyeler/${row.memberId}`} size="sm" className="font-medium">
          {row.membershipNumber}
        </Link>
      ),
    },
    {
      key: "lastName",
      label: t("colFullName"),
      sortable: true,
      width: 200,
      render: (row: DuesReportRow) => (
        <Link href={`/uyeler/${row.memberId}`} size="sm" className="text-foreground">
          {row.fullName}
        </Link>
      ),
    },
    {
      key: "type",
      label: t("colType"),
      width: 110,
      render: (row: DuesReportRow) => <TypeBadge type={row.type} />,
    },
    {
      key: "amountDue",
      label: t("colAmountDue"),
      sortable: true,
      width: 130,
      render: (row: DuesReportRow) => formatMoney(row.amountDueCents),
    },
    {
      key: "paid",
      label: t("colPaid"),
      width: 130,
      render: (row: DuesReportRow) => formatMoney(row.paidCents),
    },
    {
      key: "remaining",
      label: t("colRemaining"),
      width: 130,
      render: (row: DuesReportRow) =>
        row.remainingCents > 0 ? (
          <span className="font-medium text-warning-600">{formatMoney(row.remainingCents)}</span>
        ) : (
          formatMoney(0)
        ),
    },
    {
      key: "status",
      label: t("colStatus"),
      sortable: true,
      width: 110,
      render: (row: DuesReportRow) => <DuesStatusBadge status={row.status} />,
    },
    {
      key: "dueDate",
      label: t("colDueDate"),
      sortable: true,
      width: 130,
      render: (row: DuesReportRow) => (
        <span className={row.overdue ? "font-medium text-danger" : undefined}>
          {formatDate(row.dueDate)}
          {row.overdue ? ` · ${t("overdue")}` : ""}
        </span>
      ),
    },
    {
      key: "lastPaymentAt",
      label: t("colLastPayment"),
      width: 130,
      render: (row: DuesReportRow) => (row.lastPaymentAt ? formatDate(row.lastPaymentAt) : "-"),
    },
  ];

  const rowActions = (row: DuesReportRow): DataTableRowAction[] => [
    {
      key: "view",
      label: t("goToMember"),
      icon: <Eye className="h-4 w-4" />,
      href: `/uyeler/${row.memberId}`,
    },
  ];

  return (
    <DataTable<DuesReportRow>
      ariaLabel={ariaLabel}
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      q={q}
      filters={filters}
      toolbarExtra={toolbarExtra}
      searchPlaceholder={searchPlaceholder}
      rowActions={rowActions}
      emptyMessage={emptyMessage}
    />
  );
}
