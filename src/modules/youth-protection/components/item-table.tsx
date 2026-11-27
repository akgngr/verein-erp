"use client";

import { AlertTriangle, Clock, FileText, Pencil, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
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
import {
  getInspectionStatus,
  type YouthProtectionRecordStatus,
  type YouthProtectionRow,
  type YouthProtectionValidityStatus,
} from "../types";
import type { FeeExemptionLetterOrganization } from "../services/fee-exemption-letter";
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
  organization,
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
  organization?: FeeExemptionLetterOrganization;
}) {
  const t = useTranslations("youth-protection.table");
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const [deleting, setDeleting] = useState<YouthProtectionRow | null>(null);
  const [letterPerson, setLetterPerson] = useState<string | null>(null);

  const getValidityTone = (status: YouthProtectionValidityStatus): "danger" | "warning" | "success" | "default" => {
    switch (status) {
      case "overdue":
        return "danger";
      case "upcoming":
        return "warning";
      case "valid":
        return "success";
      case "ended":
        return "default";
    }
  };

  const getValidityIcon = (status: YouthProtectionValidityStatus) => {
    switch (status) {
      case "overdue":
        return <AlertTriangle className="h-3.5 w-3.5" />;
      case "upcoming":
        return <Clock className="h-3.5 w-3.5" />;
      case "valid":
        return <ShieldCheck className="h-3.5 w-3.5" />;
      case "ended":
        return <ShieldAlert className="h-3.5 w-3.5" />;
    }
  };

  const getRecordStatusTone = (status: YouthProtectionRecordStatus): "success" | "danger" | "warning" => {
    switch (status) {
      case "CLEARED":
        return "success";
      case "EXCLUDED":
        return "danger";
      case "PENDING":
        return "warning";
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
      key: "status",
      label: t("status"),
      sortable: true,
      render: (row) => (
        <StatusChip tone={getRecordStatusTone(row.status)}>
          {t(`recordStatus_${row.status}`)}
        </StatusChip>
      ),
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
        const validity = getInspectionStatus(new Date(row.nextDueDate), row.activityEndedAt);
        return (
          <div className="flex items-center gap-2">
            <span>{formatDate(row.nextDueDate)}</span>
            <StatusChip tone={getValidityTone(validity)}>
              <span className="flex items-center gap-1">
                {getValidityIcon(validity)}
                {t(`validity_${validity}`)}
              </span>
            </StatusChip>
          </div>
        );
      },
    },
    {
      key: "activityEndedAt",
      label: t("activityEndedAt"),
      sortable: true,
      render: (row) => (row.activityEndedAt ? formatDate(row.activityEndedAt) : "—"),
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
        // #585: Durum filtresi sorguda vardı ama arayüze bağlı değildi.
        filters={[
          {
            key: "status",
            label: t("filterStatus"),
            options: (["overdue", "upcoming", "valid", "ended"] as const).map((value) => ({ value, label: t(`filter_${value}`) })),
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

      {/* #585: Her açılışta yeniden kurulur; aksi halde ilk açılıştaki ad useState'te kalıyordu. */}
      <FeeExemptionLetterModal
        key={letterPerson ?? "closed"}
        organization={organization}
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
