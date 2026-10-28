"use client";

import { Link, addToast } from "@heroui/react";
import { Eye, Paperclip, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableRowAction,
} from "@/shared/components/data-table/types";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils";

import type { DocumentDirection, DocumentStatus } from "@prisma/client";

import { deleteDocumentAction } from "../actions/delete-document";
import { SUBJECT_TRUNCATE_LENGTH } from "../constants";
import { DirectionBadge } from "./direction-badge";
import { StatusBadge } from "./status-badge";

/**
 * Evrak listesi tablosu (8.1).
 */
export function DocumentTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  filters,
  topRightExtra,
  dateFilter,
  filterExtra,
  toolbarExtra,
  canUpdate,
  canDelete,
}: {
  rows: DocumentRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  filters?: DataTableFilter[];
  topRightExtra?: React.ReactNode;
  dateFilter?: React.ReactNode;
  filterExtra?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("documents");
  const [deleting, setDeleting] = useState<DocumentRow | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteDocumentAction({ id: deleting.id });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({
      title: t("list.deletedToast", { registryNumber: deleting.registryNumber }),
      color: "success",
    });
    setDeleting(null);
    router.refresh();
  };

  const columns: DataTableColumn<DocumentRow>[] = [
    {
      key: "registryNumber",
      label: t("list.registryNumber"),
      sortable: true,
      width: 150,
      render: (row) => (
        <Link href={`/evrak/${row.id}`} size="sm" className="font-medium">
          {row.registryNumber}
        </Link>
      ),
    },
    {
      key: "direction",
      label: t("list.direction"),
      width: 90,
      render: (row) => <DirectionBadge direction={row.direction} />,
    },
    {
      key: "documentDate",
      label: t("list.documentDate"),
      sortable: true,
      width: 120,
      render: (row) => formatDate(row.documentDate),
    },
    {
      key: "counterparty",
      label: t("list.counterparty"),
      sortable: true,
      width: 200,
      render: (row) => <span className="line-clamp-2">{row.counterparty}</span>,
    },
    {
      key: "subject",
      label: t("list.subject"),
      sortable: true,
      render: (row) => (
        <span title={row.subject}>
          {row.subject.length > SUBJECT_TRUNCATE_LENGTH
            ? `${row.subject.slice(0, SUBJECT_TRUNCATE_LENGTH)}…`
            : row.subject}
        </span>
      ),
    },
    {
      key: "categoryName",
      label: t("list.category"),
      width: 130,
      render: (row) => row.categoryName ?? "-",
    },
    {
      key: "status",
      label: t("list.status"),
      sortable: true,
      width: 120,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "assigneeLabel",
      label: t("list.assignee"),
      width: 150,
      render: (row) => row.assigneeLabel ?? "-",
    },
    {
      key: "dueDate",
      label: t("list.dueDate"),
      sortable: true,
      width: 150,
      render: (row) =>
        row.dueDate ? (
          <span className={row.isOverdue ? "font-medium text-danger-600" : undefined}>
            {formatDate(row.dueDate)}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "fileCount",
      label: t("list.files"),
      align: "center",
      width: 80,
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-small text-default-600">
          <Paperclip className="h-3.5 w-3.5" aria-hidden />
          {row.fileCount}
        </span>
      ),
    },
  ];

  const rowActions = (row: DocumentRow): DataTableRowAction[] => [
    { key: "view", label: t("list.view"), icon: <Eye className="h-4 w-4" />, href: `/evrak/${row.id}` },
    ...(canUpdate
      ? [
          {
            key: "edit",
            label: t("list.edit"),
            icon: <Pencil className="h-4 w-4" />,
            href: `/evrak/${row.id}/duzenle`,
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            key: "delete",
            label: t("list.delete"),
            icon: <Trash2 className="h-4 w-4" />,
            color: "danger" as const,
            onPress: () => setDeleting(row),
          },
        ]
      : []),
  ];

  return (
    <>
      <DataTable<DocumentRow>
        ariaLabel={t("list.aria")}
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        filters={filters}
        topRightExtra={topRightExtra}
        dateFilter={dateFilter}
        filterExtra={filterExtra}
        toolbarExtra={toolbarExtra}
        searchPlaceholder={t("filter.search")}
        rowActions={rowActions}
        emptyMessage={t("list.empty")}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("list.deleteTitle")}
        message={t("list.deleteMessage", { registryNumber: deleting?.registryNumber ?? "" })}
        confirmLabel={t("list.delete")}
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
}

export type DocumentRow = {
  id: string;
  direction: DocumentDirection;
  registryNumber: string;
  counterparty: string;
  subject: string;
  status: DocumentStatus;
  documentDate: Date;
  dueDate: Date | null;
  isOverdue: boolean;
  categoryName: string | null;
  assigneeLabel: string | null;
  fileCount: number;
};
