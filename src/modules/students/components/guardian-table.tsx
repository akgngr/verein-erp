"use client";

import { addToast } from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { deleteGuardianAction } from "../actions/guardian-actions";
import type { GuardianRow } from "../types";

export function GuardianTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  canUpdate,
  canDelete,
}: {
  rows: GuardianRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("students.guardianTable");
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const [deleting, setDeleting] = useState<GuardianRow | null>(null);

  const columns: DataTableColumn<GuardianRow>[] = [
    { key: "debtorNumber", label: t("debtorNumber"), sortable: true, width: 120 },
    { key: "lastName", label: t("name"), sortable: true, render: (row) => `${row.lastName}, ${row.firstName}` },
    {
      key: "address",
      label: t("address"),
      render: (row) => [[row.street, row.houseNumber].filter(Boolean).join(" "), [row.postalCode, row.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—",
    },
    { key: "contact", label: t("contact"), render: (row) => [row.email, row.phone].filter(Boolean).join(" · ") || "—" },
    { key: "sepa", label: t("sepa"), render: (row) => (row.iban && row.sepaMandateReference ? t("sepaYes") : "—") },
    { key: "studentCount", label: t("students"), align: "end", render: (row) => row.studentCount },
  ];

  return (
    <>
      <DataTable<GuardianRow>
        ariaLabel={t("aria")}
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        searchPlaceholder={t("search")}
        emptyMessage={t("empty")}
        rowActions={(row) => [
          { key: "edit", label: t("edit"), icon: <Pencil className="h-4 w-4" />, href: drawerHref("duzenle", row.id), hidden: !canUpdate },
          { key: "delete", label: t("delete"), icon: <Trash2 className="h-4 w-4" />, color: "danger", onPress: () => setDeleting(row), hidden: !canDelete },
        ]}
      />
      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        message={deleting ? t("deleteMessage", { name: `${deleting.firstName} ${deleting.lastName}`, number: deleting.debtorNumber }) : ""}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteGuardianAction({ id: deleting.id });
          if (!result.ok) {
            addToast({ title: result.error, color: "danger" });
            return;
          }
          addToast({ title: t("deleted"), color: "success" });
          setDeleting(null);
          router.refresh();
        }}
      />
    </>
  );
}
