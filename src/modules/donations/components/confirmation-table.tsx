"use client";

import { Link } from "@heroui/react";
import { AlertTriangle, Eye } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn, DataTableRowAction } from "@/shared/components/data-table/types";

import type { ConfirmationListItem } from "../types";

/** Bildirim tablosu (§ 15 md. 5) + void uyarısı (§ 11 md. 11). */
export function ConfirmationTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  year,
  canDelete,
}: {
  rows: ConfirmationListItem[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  year: number;
  canDelete: boolean;
}) {
  const t = useTranslations("donations.confirmations");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  const columns: DataTableColumn<ConfirmationListItem>[] = [
    {
      key: "confirmationNumber",
      label: t("columns.number"),
      sortable: true,
      width: 140,
      render: (row) => (
        <Link
          href={`/bagislar/bildirimler/${row.id}`}
          size="sm"
          className={`font-medium${row.status === "CANCELLED" ? " text-default-400 line-through decoration-danger-400" : ""}`}
        >
          {row.confirmationNumber}
        </Link>
      ),
    },
    {
      key: "issuedAt",
      label: t("columns.date"),
      sortable: true,
      width: 110,
      render: (row) => (row.issuedAt instanceof Date ? row.issuedAt.toISOString().slice(0, 10) : ""),
    },
    {
      key: "kind",
      label: t("columns.kind"),
      width: 130,
      render: (row) => `${t(`kind.${row.kind}`)} · ${t(`content.${row.content}`)}`,
    },
    {
      key: "recipientName",
      label: t("columns.recipient"),
      width: 240,
      render: (row) => (
        <span className={row.status === "CANCELLED" ? "text-default-400" : ""}>{row.recipientName}</span>
      ),
    },
    {
      key: "totalCents",
      label: t("columns.total"),
      align: "end",
      width: 120,
      sortable: false,
      render: (row) => format(row.totalCents),
    },
    {
      key: "status",
      label: t("columns.status"),
      width: 110,
      render: (row) =>
        row.status === "CANCELLED" ? (
          <span className="font-medium text-danger">{t("status.CANCELLED")}</span>
        ) : (
          <span className="text-success">{t("status.ISSUED")}</span>
        ),
    },
    {
      key: "voidedPaymentWarning",
      label: t("columns.warning"),
      width: 70,
      render: (row) =>
        row.voidedPaymentWarning ? (
          <AlertTriangle className="h-4 w-4 text-danger" aria-label={t("voidedWarning")} />
        ) : null,
    },
  ];

  const rowActions = (row: ConfirmationListItem): DataTableRowAction[] => [
    { key: "view", label: t("actions.view"), icon: <Eye className="h-4 w-4" />, href: `/bagislar/bildirimler/${row.id}` },
    {
      key: "pdf",
      label: t("actions.pdf"),
      icon: <FileDownIcon />,
      href: `/api/donations/confirmations/${row.id}/pdf`,
    },
  ];

  return (
    <DataTable<ConfirmationListItem>
      ariaLabel={t("title")}
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      q={q}
      searchPlaceholder={t("columns.number")}
      filters={[
        { key: "year", label: t("columns.date") + " (yıl)", options: [{ value: String(year), label: String(year) }] },
        {
          key: "kind",
          label: t("columns.kind"),
          options: [
            { value: "SINGLE", label: t("kind.SINGLE") },
            { value: "COLLECTIVE", label: t("kind.COLLECTIVE") },
          ],
        },
        {
          key: "content",
          label: t("columns.kind"),
          options: [
            { value: "DONATION", label: t("content.DONATION") },
            { value: "MEMBERSHIP_FEE", label: t("content.MEMBERSHIP_FEE") },
          ],
        },
        {
          key: "status",
          label: t("columns.status"),
          options: [
            { value: "ISSUED", label: t("status.ISSUED") },
            { value: "CANCELLED", label: t("status.CANCELLED") },
          ],
        },
      ]}
      rowActions={rowActions}
      emptyMessage={t("empty")}
      toolbarExtra={canDelete ? undefined : undefined}
    />
  );
}

function FileDownIcon() {
  return <span aria-hidden>📄</span>;
}
