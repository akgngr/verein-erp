"use client";
import { toast, Link } from "@heroui/react";

import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";

import { Archive, CheckCircle2, Circle, Eye, LoaderCircle, Paperclip, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableRowAction,
} from "@/shared/components/data-table/types";
import type { DataTableSelection } from "@/shared/data-table/selection-contract";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils";

import type { DocumentDirection, DocumentStatus } from "@prisma/client";

import { bulkChangeDocumentStatusAction } from "../actions/bulk-change-status";
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
  const drawerHref = useFormDrawerHref();
  const t = useTranslations("documents");
  const [deleting, setDeleting] = useState<DocumentRow | null>(null);
  const [selection, setSelection] = useState<DataTableSelection>({
    type: "explicit",
    ids: [],
  });
  const [bulkPending, setBulkPending] = useState(false);

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteDocumentAction({ id: deleting.id });
    if (!result.ok) {
      toast(result.error, { variant: "danger" });
      return;
    }
    toast(t("list.deletedToast", { registryNumber: deleting.registryNumber }), {
      variant: "success",
    });
    setDeleting(null);
    router.refresh();
  };

  const runBulkStatus = async (
    currentSelection: DataTableSelection,
    status: DocumentStatus,
  ) => {
    setBulkPending(true);
    try {
      const result = await bulkChangeDocumentStatusAction({
        selection: currentSelection,
        status,
      });
      if (!result.ok) {
        toast(result.error, { variant: "danger" });
        return;
      }

      toast(
        t("bulk.success", {
          updated: result.data.updated,
          skipped: result.data.skipped,
        }),
        { variant: "success" },
      );
      setSelection({ type: "explicit", ids: [] });
      router.refresh();
    } finally {
      setBulkPending(false);
    }
  };

  const columns: DataTableColumn<DocumentRow>[] = [
    {
      key: "registryNumber",
      label: t("list.registryNumber"),
      sortable: true,
      width: 150,
      render: (row) => (
        <Link
          href={`/evrak/${row.id}`}
          className={["font-medium", "text-sm"].filter(Boolean).join(" ")}
        >
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
          <span
            className={
              row.isOverdue ? "font-medium text-danger-600" : undefined
            }
          >
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
        <span className="inline-flex items-center gap-1 text-sm text-ink-600">
          <Paperclip className="h-3.5 w-3.5" aria-hidden />
          {row.fileCount}
        </span>
      ),
    },
  ];

  const rowActions = (row: DocumentRow): DataTableRowAction[] => [
    {
      key: "view",
      label: t("list.view"),
      icon: <Eye className="h-4 w-4" />,
      href: `/evrak/${row.id}`,
    },
    ...(canUpdate
      ? [
          {
            key: "edit",
            label: t("list.edit"),
            icon: <Pencil className="h-4 w-4" />,
            href: drawerHref("duzenle", row.id),
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
        selection={
          canUpdate
            ? {
                mode: "multiple",
                value: selection,
                onChange: setSelection,
                allowQuerySelection: true,
                bulkActions: [
                  {
                    key: "open",
                    label: t("bulk.open"),
                    icon: <Circle className="h-4 w-4" />,
                    disabled: bulkPending,
                    onPress: (currentSelection) =>
                      runBulkStatus(currentSelection, "OPEN"),
                  },
                  {
                    key: "in-progress",
                    label: t("bulk.inProgress"),
                    icon: <LoaderCircle className="h-4 w-4" />,
                    disabled: bulkPending,
                    onPress: (currentSelection) =>
                      runBulkStatus(currentSelection, "IN_PROGRESS"),
                  },
                  {
                    key: "completed",
                    label: t("bulk.completed"),
                    icon: <CheckCircle2 className="h-4 w-4" />,
                    disabled: bulkPending,
                    onPress: (currentSelection) =>
                      runBulkStatus(currentSelection, "COMPLETED"),
                  },
                  {
                    key: "archived",
                    label: t("bulk.archived"),
                    icon: <Archive className="h-4 w-4" />,
                    disabled: bulkPending,
                    onPress: (currentSelection) =>
                      runBulkStatus(currentSelection, "ARCHIVED"),
                  },
                ],
              }
            : undefined
        }
        emptyMessage={t("list.empty")}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("list.deleteTitle")}
        message={t("list.deleteMessage", {
          registryNumber: deleting?.registryNumber ?? "",
        })}
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
