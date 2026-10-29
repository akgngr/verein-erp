"use client";

import { addToast, Button, Chip } from "@heroui/react";
import { AlertCircle, CheckCircle, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDateTime } from "@/shared/utils";

import { completeTaskAction, deleteTaskAction } from "../actions/item-actions";
import type { MemberOption, TasksRow } from "../types";

export function TasksItemTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  memberOptions,
  canUpdate,
  canDelete,
}: {
  rows: TasksRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  memberOptions: MemberOption[];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("tasks.table");
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const [deleting, setDeleting] = useState<TasksRow | null>(null);

  const columns: DataTableColumn<TasksRow>[] = [
    {
      key: "title",
      label: t("title"),
      sortable: true,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{row.title}</span>
          {row.description ? (
            <span className="text-xs text-default-400 line-clamp-1">{row.description}</span>
          ) : null}
          {row.meetingLabel ? (
            <span className="text-xs text-primary-600 dark:text-primary-400">
              {row.meetingLabel}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      label: t("status"),
      sortable: true,
      render: (row) => {
        const colorMap = {
          OPEN: "warning",
          IN_PROGRESS: "primary",
          DONE: "success",
          CANCELLED: "default",
        } as const;

        return (
          <div className="flex items-center gap-1.5">
            <Chip size="sm" variant="flat" color={colorMap[row.status]}>
              {t(`statuses.${row.status}`)}
            </Chip>
            {canUpdate && row.status !== "DONE" ? (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="success"
                aria-label={t("markDone")}
                title={t("markDone")}
                className="h-6 w-6 min-w-6 text-default-400 hover:text-success"
                onPress={async () => {
                  const res = await completeTaskAction({ id: row.id });
                  if (!res.ok) {
                    addToast({ title: res.error, color: "danger" });
                    return;
                  }
                  addToast({ title: t("markedDone"), color: "success" });
                  router.refresh();
                }}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "priority",
      label: t("priority"),
      sortable: true,
      render: (row) => {
        const colorMap = {
          HIGH: "danger",
          NORMAL: "primary",
          LOW: "default",
        } as const;

        return (
          <Chip size="sm" variant="dot" color={colorMap[row.priority]}>
            {t(`priorities.${row.priority}`)}
          </Chip>
        );
      },
    },
    {
      key: "dueDate",
      label: t("dueDate"),
      sortable: true,
      render: (row) => {
        if (!row.dueDate) return <span className="text-default-400">-</span>;
        if (row.isOverdue) {
          return (
            <Chip
              size="sm"
              color="danger"
              variant="flat"
              startContent={<AlertCircle className="h-3 w-3 ml-1" />}
            >
              {row.dueDate}
            </Chip>
          );
        }
        return <span className="text-sm">{row.dueDate}</span>;
      },
    },
    {
      key: "memberName",
      label: t("assignee"),
      render: (row) =>
        row.memberName ? (
          <span className="text-sm">{row.memberName}</span>
        ) : (
          <span className="text-default-400">-</span>
        ),
    },
    {
      key: "updatedAt",
      label: t("updatedAt"),
      sortable: true,
      render: (row) => formatDateTime(row.updatedAt),
    },
  ];

  return (
    <>
      <DataTable<TasksRow>
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
          {
            key: "status",
            label: t("status"),
            options: [
              { value: "OPEN", label: t("statuses.OPEN") },
              { value: "IN_PROGRESS", label: t("statuses.IN_PROGRESS") },
              { value: "DONE", label: t("statuses.DONE") },
              { value: "CANCELLED", label: t("statuses.CANCELLED") },
            ],
          },
          {
            key: "priority",
            label: t("priority"),
            options: [
              { value: "HIGH", label: t("priorities.HIGH") },
              { value: "NORMAL", label: t("priorities.NORMAL") },
              { value: "LOW", label: t("priorities.LOW") },
            ],
          },
          {
            key: "memberId",
            label: t("assignee"),
            options: memberOptions.map((m) => ({ value: m.id, label: m.label })),
          },
        ]}
        emptyMessage={t("empty")}
        rowActions={(row) => [
          {
            key: "complete",
            label: row.status === "DONE" ? t("reopen") : t("markDone"),
            icon:
              row.status === "DONE" ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4 text-success" />
              ),
            onPress: async () => {
              const res = await completeTaskAction({ id: row.id });
              if (!res.ok) {
                addToast({ title: res.error, color: "danger" });
                return;
              }
              addToast({
                title: row.status === "DONE" ? t("reopened") : t("markedDone"),
                color: "success",
              });
              router.refresh();
            },
            hidden: !canUpdate,
          },
          {
            key: "edit",
            label: t("edit"),
            icon: <Pencil className="h-4 w-4" />,
            href: drawerHref("duzenle", row.id),
            hidden: !canUpdate,
          },
          {
            key: "delete",
            label: t("delete"),
            icon: <Trash2 className="h-4 w-4" />,
            color: "danger",
            onPress: () => setDeleting(row),
            hidden: !canDelete,
          },
        ]}
      />
      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("deleteTitle")}
        message={deleting ? t("deleteMessage", { title: deleting.title }) : ""}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteTaskAction({ id: deleting.id });
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
