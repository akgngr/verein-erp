"use client";

import { Chip } from "@heroui/react";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { formatDate } from "@/shared/utils";

import { INVOICE_KIND_VALUES, INVOICE_STATUS_VALUES } from "../constants";
import type { InvoiceListRow } from "../queries/invoices";

export const INVOICE_STATUS_COLOR = { DRAFT: "default", ISSUED: "primary", PAID: "success", CANCELLED: "danger" } as const;

const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

/** Durum çipi (sunucu view'larında da kullanılır). */
export function InvoiceStatusChip({ status, overdue }: { status: keyof typeof INVOICE_STATUS_COLOR; overdue: boolean }) {
  const t = useTranslations("accounting.invoices");
  return (
    <Chip size="sm" variant="flat" color={overdue ? "warning" : INVOICE_STATUS_COLOR[status]}>
      {overdue ? t("overdue") : t(`status.${status}`)}
    </Chip>
  );
}

export function InvoiceTable({ rows, q }: { rows: InvoiceListRow[]; q?: string }) {
  const t = useTranslations("accounting.invoices");
  const columns: DataTableColumn<InvoiceListRow>[] = [
    { key: "number", label: t("columns.number"), render: (row) => row.number ?? <span className="text-default-400">{t("draftNumber")}</span> },
    { key: "kind", label: t("columns.kind"), render: (row) => t(`kind.${row.kind}`) },
    { key: "issueDate", label: t("columns.issueDate"), render: (row) => formatDate(row.issueDate) },
    { key: "recipientName", label: t("columns.recipient"), render: (row) => (row.subject ? `${row.recipientName} · ${row.subject}` : row.recipientName) },
    { key: "grossCents", label: t("columns.gross"), align: "end", render: (row) => euro(row.grossCents) },
    { key: "openCents", label: t("columns.open"), align: "end", render: (row) => (row.openCents > 0 ? <span className={row.overdue ? "text-danger" : ""}>{euro(row.openCents)}</span> : "—") },
    {
      key: "status",
      label: t("columns.status"),
      render: (row) => <InvoiceStatusChip status={row.status} overdue={row.overdue} />,
    },
  ];
  return (
    <DataTable<InvoiceListRow>
      ariaLabel={t("title")}
      columns={columns}
      rows={rows}
      total={rows.length}
      page={1}
      pageSize={Math.max(rows.length, 1)}
      q={q}
      searchPlaceholder={t("search")}
      filters={[
        { key: "kind", label: t("columns.kind"), options: INVOICE_KIND_VALUES.map((value) => ({ value, label: t(`kind.${value}`) })) },
        { key: "status", label: t("columns.status"), options: INVOICE_STATUS_VALUES.map((value) => ({ value, label: t(`status.${value}`) })) },
      ]}
      emptyMessage={t("empty")}
      rowActions={(row) => [{ key: "open", label: t("open"), icon: <Eye className="h-4 w-4" />, href: `/muhasebe/faturalar/${row.id}` }]}
    />
  );
}
