"use client";

import { addToast, Chip } from "@heroui/react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils";

import { deleteStudentAction } from "../actions/student-actions";
import { STUDENT_STATUS_VALUES } from "../constants";
import type { StudentRow } from "../types";

export function StudentTable({
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
  rows: StudentRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("students.table");
  const tStatus = useTranslations("students.status");
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const [deleting, setDeleting] = useState<StudentRow | null>(null);

  const columns: DataTableColumn<StudentRow>[] = [
    { key: "studentNumber", label: t("number"), sortable: true, width: 140 },
    { key: "lastName", label: t("name"), sortable: true, render: (row) => `${row.lastName}, ${row.firstName}` },
    { key: "birthDate", label: t("birthDate"), render: (row) => (row.birthDate ? formatDate(row.birthDate) : "—") },
    { key: "school", label: t("school"), render: (row) => [row.school, row.gradeLevel].filter(Boolean).join(" · ") || "—" },
    {
      key: "payer",
      label: t("payer"),
      render: (row) => (row.payerLabel ? `${row.payerLabel} (${row.payerDebtorNumber})` : <span className="text-warning-600">{t("noPayer")}</span>),
    },
    {
      key: "status",
      label: t("status"),
      render: (row) => (
        <Chip size="sm" variant="flat" color={row.status === "ACTIVE" ? "success" : "default"}>
          {tStatus(row.status)}
        </Chip>
      ),
    },
  ];

  return (
    <>
      <DataTable<StudentRow>
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
        filters={[{ key: "status", label: t("status"), options: STUDENT_STATUS_VALUES.map((value) => ({ value, label: tStatus(value) })) }]}
        emptyMessage={t("empty")}
        rowActions={(row) => [
          { key: "open", label: t("open"), icon: <Eye className="h-4 w-4" />, href: `/ogrenciler/${row.id}` },
          { key: "edit", label: t("edit"), icon: <Pencil className="h-4 w-4" />, href: drawerHref("duzenle", row.id), hidden: !canUpdate },
          { key: "delete", label: t("delete"), icon: <Trash2 className="h-4 w-4" />, color: "danger", onPress: () => setDeleting(row), hidden: !canDelete },
        ]}
      />
      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        message={deleting ? t("deleteMessage", { name: `${deleting.firstName} ${deleting.lastName}` }) : ""}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteStudentAction({ id: deleting.id });
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
