"use client";

import { Link } from "@heroui/react";
import { Eye, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn, DataTableRowAction } from "@/shared/components/data-table/types";

import type { DonorListItem } from "../types";

/** Bağışçı tablosu (§ 15 md. 4). */
export function DonorTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  canUpdate,
}: {
  rows: DonorListItem[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("donations.donors");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  const columns: DataTableColumn<DonorListItem>[] = [
    {
      key: "donorNumber",
      label: t("columns.number"),
      sortable: true,
      width: 110,
      render: (row) => (
        <Link href={`/bagislar/bagiscilar/${row.id}`} size="sm" className="font-medium">
          SP-{String(row.donorNumber).padStart(4, "0")}
        </Link>
      ),
    },
    {
      key: "lastName",
      label: t("columns.name"),
      sortable: true,
      width: 240,
      render: (row) => (
        <span className={row.isAnonymized ? "text-default-400" : ""}>
          {row.displayName}
          {row.isAnonymized ? ` (${t("detail.anonymizedMark")})` : ""}
        </span>
      ),
    },
    { key: "city", label: t("columns.city"), width: 140, render: (row) => row.city ?? "—" },
    { key: "donationCount", label: t("columns.count"), width: 110, align: "end" },
    { key: "totalCents", label: t("columns.total"), width: 130, align: "end", render: (row) => format(row.totalCents) },
    {
      key: "isActive",
      label: t("columns.status"),
      width: 90,
      render: (row) => (row.isActive ? "✓" : "✗"),
    },
  ];

  const rowActions = (row: DonorListItem): DataTableRowAction[] => [
    { key: "view", label: t("detail.anonymize"), icon: <Eye className="h-4 w-4" />, href: `/bagislar/bagiscilar/${row.id}` },
    ...(canUpdate
      ? [{ key: "edit", label: t("form.editTitle"), icon: <Pencil className="h-4 w-4" />, href: `/bagislar/bagiscilar/${row.id}/duzenle` }]
      : []),
  ];

  return (
    <DataTable<DonorListItem>
      ariaLabel={t("title")}
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      q={q}
      filters={[
        {
          key: "type",
          label: t("form.type"),
          options: [
            { value: "PERSON", label: t("form.typePERSON") },
            { value: "ORGANIZATION", label: t("form.typeORGANIZATION") },
          ],
        },
        {
          key: "active",
          label: t("columns.status"),
          options: [
            { value: "1", label: "Aktif" },
            { value: "0", label: "Pasif" },
          ],
        },
      ]}
      searchPlaceholder={t("columns.name")}
      rowActions={rowActions}
      emptyMessage={t("empty")}
    />
  );
}
