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
import { formatMoney } from "@/shared/money";
import { formatDate } from "@/shared/utils";

import { deleteCourseAction } from "../actions/course-actions";
import { COURSE_KIND_VALUES, COURSE_STATUS_VALUES } from "../constants";
import type { CourseRow, CourseStatus } from "../types";

const STATUS_COLOR: Record<CourseStatus, "default" | "primary" | "success" | "danger"> = {
  PLANNED: "primary",
  ACTIVE: "success",
  COMPLETED: "default",
  CANCELLED: "danger",
};

export function CourseTable({
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
  rows: CourseRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("courses.table");
  const tEnum = useTranslations("courses.enums");
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const [deleting, setDeleting] = useState<CourseRow | null>(null);

  const columns: DataTableColumn<CourseRow>[] = [
    { key: "code", label: t("code"), sortable: true, width: 120 },
    {
      key: "title",
      label: t("title"),
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.title}</span>
          <span className="text-tiny text-default-500">{[tEnum(`kind.${row.kind}`), row.subject, row.teacherNames.join(", ")].filter(Boolean).join(" · ")}</span>
        </div>
      ),
    },
    { key: "startDate", label: t("period"), sortable: true, render: (row) => `${formatDate(row.startDate)}${row.endDate ? ` – ${formatDate(row.endDate)}` : ""}` },
    {
      key: "fee",
      label: t("fee"),
      render: (row) => (row.feeType === "FREE" ? tEnum("feeType.FREE") : `${formatMoney(row.feeCents)} · ${tEnum(`feeType.${row.feeType}`)}`),
    },
    { key: "enrolled", label: t("enrolled"), align: "end", render: (row) => (row.capacity ? `${row.enrolledCount} / ${row.capacity}` : row.enrolledCount) },
    {
      key: "status",
      label: t("status"),
      render: (row) => (
        <Chip size="sm" variant="flat" color={STATUS_COLOR[row.status]}>
          {tEnum(`status.${row.status}`)}
        </Chip>
      ),
    },
  ];

  return (
    <>
      <DataTable<CourseRow>
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
        filters={[
          { key: "status", label: t("status"), options: COURSE_STATUS_VALUES.map((value) => ({ value, label: tEnum(`status.${value}`) })) },
          { key: "kind", label: t("kind"), options: COURSE_KIND_VALUES.map((value) => ({ value, label: tEnum(`kind.${value}`) })) },
        ]}
        emptyMessage={t("empty")}
        rowActions={(row) => [
          { key: "open", label: t("open"), icon: <Eye className="h-4 w-4" />, href: `/kurslar/${row.id}` },
          { key: "edit", label: t("edit"), icon: <Pencil className="h-4 w-4" />, href: drawerHref("duzenle", row.id), hidden: !canUpdate },
          { key: "delete", label: t("delete"), icon: <Trash2 className="h-4 w-4" />, color: "danger", onPress: () => setDeleting(row), hidden: !canDelete },
        ]}
      />
      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        message={deleting ? t("deleteMessage", { title: deleting.title }) : ""}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteCourseAction({ id: deleting.id });
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
