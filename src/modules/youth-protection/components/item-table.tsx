"use client";

import { AlertTriangle, Clock, FileText, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";
import { StatusChip } from "@/shared/components/kit";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { notify } from "@/shared/components/ui/notify";
import { formatDate } from "@/shared/utils";

import { deleteYouthProtectionItemAction } from "../actions/item-actions";
import { getInspectionStatus, type YouthProtectionRow, type YouthProtectionStatus } from "../types";
import { FeeExemptionLetterModal } from "./fee-exemption-letter-modal";

export function YouthProtectionItemTable({
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
  rows: YouthProtectionRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("youth-protection.table");
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const [deleting, setDeleting] = useState<YouthProtectionRow | null>(null);
  const [letterPerson, setLetterPerson] = useState<string | null>(null);

  const getStatusTone = (status: YouthProtectionStatus): "danger" | "warning" | "success" => {
    switch (status) {
      case "overdue":
        return "danger";
      case "upcoming":
        return "warning";
      case "valid":
        return "success";
    }
  };

  const getStatusIcon = (status: YouthProtectionStatus) => {
    switch (status) {
      case "overdue":
        return <AlertTriangle className="h-3.5 w-3.5" />;
      case "upcoming":
        return <Clock className="h-3.5 w-3.5" />;
      case "valid":
        return <ShieldCheck className="h-3.5 w-3.5" />;
    }
  };

  const columns: DataTableColumn<YouthProtectionRow>[] = [
    {
      key: "personName",
      label: t("personName"),
      sortable: true,
      render: (row) => <span className="font-medium text-foreground">{row.personName}</span>,
    },
    {
      key: "inspectionDate",
      label: t("inspectionDate"),
      sortable: true,
      render: (row) => formatDate(row.inspectionDate),
    },
    {
      key: "certificateIssueDate",
      label: t("certificateIssueDate"),
      sortable: true,
      render: (row) => formatDate(row.certificateIssueDate),
    },
    {
      key: "inspectingOfficer",
      label: t("inspectingOfficer"),
      sortable: true,
      render: (row) => row.inspectingOfficer,
    },
    {
      key: "nextDueDate",
      label: t("nextDueDate"),
      sortable: true,
      render: (row) => {
        const status = getInspectionStatus(new Date(row.nextDueDate));
        return (
          <div className="flex items-center gap-2">
            <span>{formatDate(row.nextDueDate)}</span>
            <StatusChip tone={getStatusTone(status)}>
              <span className="flex items-center gap-1">
                {getStatusIcon(status)}
                {t(`status_${status}`)}
              </span>
            </StatusChip>
          </div>
        );
      },
    },
    {
      key: "note",
      label: t("note"),
      render: (row) => (
        <span className="max-w-[200px] truncate text-xs text-foreground-500" title={row.note ?? ""}>
          {row.note || "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable<YouthProtectionRow>
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
            label: t("filterStatus"),
            options: [
              { value: "overdue", label: t("filter_overdue") },
              { value: "upcoming", label: t("filter_upcoming") },
              { value: "valid", label: t("filter_valid") },
            ],
          },
        ]}
        emptyMessage={t("empty")}
        rowActions={(row) => [
          {
            key: "letter",
            label: t("generateLetter"),
            icon: <FileText className="h-4 w-4" />,
            onPress: () => setLetterPerson(row.personName),
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

      <FeeExemptionLetterModal
        isOpen={letterPerson !== null}
        onOpenChange={(open) => {
          if (!open) setLetterPerson(null);
        }}
        initialPersonName={letterPerson ?? undefined}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("deleteTitle")}
        message={deleting ? t("deleteMessage", { name: deleting.personName }) : ""}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteYouthProtectionItemAction({ id: deleting.id });
          if (!result.ok) {
            notify.error(result.error);
            return;
          }
          notify.success(t("deleted"));
          setDeleting(null);
          router.refresh();
        }}
      />
    </>
  );
}
