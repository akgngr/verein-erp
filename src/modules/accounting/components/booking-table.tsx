"use client";

import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";
import { Link } from "@heroui/react";
import { Ban, Eye, Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/shared/components/data-table/data-table";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableRowAction,
} from "@/shared/components/data-table/types";

import type { BookingListItem } from "../types";
import { BookingTypeBadge } from "./booking-type-badge";
import { ReverseModal } from "./reverse-modal";

/**
 * Fiş listesi tablosu (§ 11.1): üye tablosu kalıbı. İptal edilenler üstü
 * çizili görünür; "Belge eksik" uyarısı; kaynak rozeti otomatik fişlerde.
 */
export function BookingTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  filters,
  searchPlaceholder,
  canUpdate,
  canDelete,
}: {
  rows: BookingListItem[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  filters?: DataTableFilter[];
  searchPlaceholder?: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("accounting.list");
  const drawerHref = useFormDrawerHref();
  const [reversing, setReversing] = useState<BookingListItem | null>(null);

  const formatAmount = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  const columns: DataTableColumn<BookingListItem>[] = [
    {
      key: "bookingNumber",
      label: t("columns.number"),
      sortable: true,
      width: 130,
      render: (row) => (
        <Link href={`/muhasebe/${row.id}`} size="sm" className={`font-medium${row.reversedAt ? " line-through decoration-danger-400" : ""}`}>
          {row.bookingNumber}
        </Link>
      ),
    },
    {
      key: "bookingDate",
      label: t("columns.date"),
      sortable: true,
      width: 110,
      render: (row) =>
        row.bookingDate instanceof Date ? row.bookingDate.toISOString().slice(0, 10) : String(row.bookingDate),
    },
    { key: "type", label: t("columns.type"), width: 110, render: (row) => <BookingTypeBadge type={row.type} /> },
    {
      key: "account",
      label: t("columns.account"),
      width: 170,
      render: (row) => row.transferLine ?? row.accountName,
    },
    { key: "category", label: t("columns.category"), width: 170, render: (row) => row.categoryName ?? "—" },
    {
      key: "description",
      label: t("columns.description"),
      width: 240,
      render: (row) => (
        <span className={row.reversedAt ? "text-default-400 line-through decoration-danger-400" : ""}>
          {row.description}
        </span>
      ),
    },
    { key: "counterparty", label: t("columns.counterparty"), width: 140, render: (row) => row.counterparty ?? "—" },
    { key: "project", label: t("columns.project"), width: 110, render: (row) => row.project ?? "—" },
    {
      key: "amount",
      label: t("columns.amount"),
      sortable: true,
      align: "end",
      width: 130,
      render: (row) => (
        <span
          className={
            row.reversedAt
              ? "text-default-400 line-through decoration-danger-400"
              : row.type === "INCOME"
                ? "font-medium text-success"
                : row.type === "EXPENSE"
                  ? "font-medium text-danger"
                  : "font-medium"
          }
        >
          {formatAmount(row.amountCents)}
        </span>
      ),
    },
    {
      key: "receipt",
      label: t("columns.receipt"),
      width: 90,
      render: (row) =>
        row.hasReceipt ? (
          <span className="text-tiny text-default-500">📎 {row.fileCount}</span>
        ) : (
          <span className="text-tiny font-medium text-warning">{t("columns.missing")}</span>
        ),
    },
    {
      key: "status",
      label: t("columns.status"),
      width: 100,
      render: (row) =>
        row.reversedAt ? (
          <span className="text-small text-danger">{t("columns.reversed")}</span>
        ) : (
          <span className="text-small">{t("columns.active")}</span>
        ),
    },
    {
      key: "source",
      label: t("columns.source"),
      width: 110,
      render: (row) =>
        row.sourceType ? (
          <span className="text-tiny text-primary">{t("sourceLabel")}</span>
        ) : null,
    },
  ];

  const rowActions = (row: BookingListItem): DataTableRowAction[] => [
    { key: "view", label: t("actions.view"), icon: <Eye className="h-4 w-4" />, href: `/muhasebe/${row.id}` },
    ...(canUpdate && !row.reversedAt && !row.sourceType
      ? [
          {
            key: "edit",
            label: t("actions.edit"),
            icon: <Pencil className="h-4 w-4" />,
            href: drawerHref("duzenle", row.id),
          },
        ]
      : []),
    ...(canDelete && !row.reversedAt && !row.sourceType
      ? [
          {
            key: "reverse",
            label: t("actions.reverse"),
            icon: <Ban className="h-4 w-4" />,
            color: "danger" as const,
            onPress: () => setReversing(row),
          },
        ]
      : []),
  ];

  return (
    <>
      <DataTable<BookingListItem>
        ariaLabel={t("title")}
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        filters={filters}
        searchPlaceholder={searchPlaceholder ?? t("filters.q")}
        rowActions={rowActions}
        emptyMessage={t("empty")}
      />

      <ReverseModal
        isOpen={reversing !== null}
        onOpenChange={(open) => !open && setReversing(null)}
        bookingId={reversing?.id ?? ""}
        bookingNumber={reversing?.bookingNumber ?? ""}
      />
    </>
  );
}
