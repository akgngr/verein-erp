"use client";

import { Link } from "@heroui/react";
import { Ban, Eye, Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn, DataTableRowAction } from "@/shared/components/data-table/types";

import type { DonationListItem } from "../types";
import { CancelDonationModal } from "./cancel-donation-modal";

/** Bağış tablosu (§ 15 md. 1). */
export function DonationTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  year,
  canUpdate,
  canDelete,
}: {
  rows: DonationListItem[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  year: number;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("donations.list");
  const tForm = useTranslations("donations.form");
  const tDetail = useTranslations("donations.detail");
  const [cancelling, setCancelling] = useState<DonationListItem | null>(null);

  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  const columns: DataTableColumn<DonationListItem>[] = [
    {
      key: "donationNumber",
      label: t("columns.number"),
      sortable: true,
      width: 130,
      render: (row) => (
        <Link href={`/bagislar/${row.id}`} size="sm" className={`font-medium${row.reversedAt ? " line-through decoration-danger-400" : ""}`}>
          {row.donationNumber}
        </Link>
      ),
    },
    {
      key: "receivedAt",
      label: t("columns.date"),
      sortable: true,
      width: 110,
      render: (row) => (row.receivedAt instanceof Date ? row.receivedAt.toISOString().slice(0, 10) : String(row.receivedAt)),
    },
    {
      key: "donorName",
      label: t("columns.donor"),
      width: 200,
      render: (row) => (
        <span className="text-small">
          {row.donorName} <span className="text-tiny text-default-400">SP-{String(row.donorNumber).padStart(4, "0")}</span>
        </span>
      ),
    },
    {
      key: "amount",
      label: t("columns.amount"),
      sortable: true,
      align: "end",
      width: 120,
      render: (row) => (
        <span className={`font-medium${row.reversedAt ? " text-default-400 line-through decoration-danger-400" : ""}`}>
          {format(row.amountCents)}
        </span>
      ),
    },
    { key: "method", label: t("columns.method"), width: 170, render: (row) => tForm(`method.${row.method}`) },
    {
      key: "waivedReimbursement",
      label: t("columns.waived"),
      width: 140,
      render: (row) => (row.waivedReimbursement ? "✓" : ""),
    },
    {
      key: "confirmationNumber",
      label: t("columns.confirmation"),
      width: 130,
      render: (row) =>
        row.confirmationNumber ? (
          <span className={row.confirmationCancelled ? "text-default-400 line-through decoration-danger-400" : "text-primary"}>
            {row.confirmationNumber}
          </span>
        ) : (
          <span className="text-tiny text-default-400">{t("columns.none")}</span>
        ),
    },
    {
      key: "bookingNumber",
      label: t("columns.booking"),
      width: 120,
      render: (row) => (row.bookingNumber ? <span className="text-tiny">{row.bookingNumber}</span> : "—"),
    },
  ];

  const rowActions = (row: DonationListItem): DataTableRowAction[] => [
    { key: "view", label: t("actions.view"), icon: <Eye className="h-4 w-4" />, href: `/bagislar/${row.id}` },
    ...(canUpdate && !row.reversedAt
      ? [{ key: "edit", label: t("actions.edit"), icon: <Pencil className="h-4 w-4" />, href: `/bagislar/${row.id}/duzenle` }]
      : []),
    ...(canDelete && !row.reversedAt
      ? [
          {
            key: "cancel",
            label: t("actions.cancel"),
            icon: <Ban className="h-4 w-4" />,
            color: "danger" as const,
            onPress: () => setCancelling(row),
          },
        ]
      : []),
  ];

  const METHODS = ["CASH", "BANK_TRANSFER", "CARD", "PAYPAL", "REIMBURSEMENT_WAIVER", "OTHER"] as const;

  return (
    <>
      <DataTable<DonationListItem>
        ariaLabel={t("title")}
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        searchPlaceholder={t("filters.q")}
        filters={[
          { key: "year", label: t("year"), options: [{ value: String(year), label: String(year) }] },
          { key: "method", label: t("filters.method"), options: METHODS.map((method) => ({ value: method, label: tForm(`method.${method}`) })) },
          {
            key: "waived",
            label: t("filters.waived"),
            options: [
              { value: "1", label: "Evet" },
              { value: "0", label: "Hayır" },
            ],
          },
          {
            key: "confirmation",
            label: t("filters.confirmation"),
            options: [
              { value: "none", label: t("filters.confirmationNone") },
              { value: "issued", label: t("filters.confirmationIssued") },
              { value: "cancelled", label: t("filters.confirmationCancelled") },
            ],
          },
          { key: "over300", label: t("filters.over300"), options: [{ value: "1", label: t("filters.over300") }] },
        ]}
        rowActions={rowActions}
        emptyMessage={t("empty")}
      />

      <CancelDonationModal
        isOpen={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        donationId={cancelling?.id ?? ""}
        donationNumber={cancelling?.donationNumber ?? ""}
        title={tDetail("cancelTitle")}
        reasonLabel={tDetail("cancelReason")}
        hint={tDetail("cancelHint")}
        confirmLabel={tDetail("cancelTitle")}
        toastTitle={tDetail("toastCancelled")}
      />
    </>
  );
}
