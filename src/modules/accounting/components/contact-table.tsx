"use client";

import { Chip } from "@heroui/react";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";

import type { ContactRow } from "../queries/contacts";

const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export function ContactTable({ rows, q, canUpdate }: { rows: ContactRow[]; q?: string; canUpdate: boolean }) {
  const t = useTranslations("accounting.contacts");
  const columns: DataTableColumn<ContactRow>[] = [
    { key: "number", label: t("fields.number"), render: (row) => <span className="font-mono">{row.number}</span> },
    { key: "type", label: t("fields.type"), render: (row) => <Chip size="sm" variant="flat" color={row.type === "CUSTOMER" ? "primary" : "secondary"}>{t(`type.${row.type}`)}</Chip> },
    { key: "name", label: t("fields.name"), render: (row) => (row.isActive ? row.name : <span className="text-default-400 line-through">{row.name}</span>) },
    { key: "email", label: t("fields.email"), render: (row) => row.email ?? "—" },
    { key: "invoiceCount", label: t("fields.invoices"), align: "end", render: (row) => String(row.invoiceCount) },
    { key: "openCents", label: t("fields.open"), align: "end", render: (row) => (row.openCents ? euro(row.openCents) : "—") },
  ];
  return (
    <DataTable<ContactRow>
      ariaLabel={t("title")}
      columns={columns}
      rows={rows}
      total={rows.length}
      page={1}
      pageSize={Math.max(rows.length, 1)}
      q={q}
      searchPlaceholder={t("search")}
      filters={[{ key: "type", label: t("fields.type"), options: (["CUSTOMER", "SUPPLIER"] as const).map((value) => ({ value, label: t(`type.${value}`) })) }]}
      emptyMessage={t("empty")}
      rowActions={(row) => (canUpdate ? [{ key: "edit", label: t("edit"), icon: <Pencil className="h-4 w-4" />, href: `/muhasebe/cariler?duzenle=${row.id}` }] : [])}
    />
  );
}
