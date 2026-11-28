"use client";

import { CircleCheck, CircleOff, PauseCircle, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";
import { StatusChip } from "@/shared/components/kit";
import type { ActionTone } from "@/shared/components/ui/action-appearance";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { notify } from "@/shared/components/ui/notify";
import type { DataTableSelection } from "@/shared/data-table/selection-contract";
import { formatMoney } from "@/shared/money";
import { formatDate } from "@/shared/utils";

import { bulkChangeSponsorStatusAction } from "../actions/bulk-change-status";
import { deleteSponsorAction } from "../actions/sponsor-actions";
import { SPONSOR_STATUSES, SPONSOR_TIERS, type SponsorStatus, type SponsorTier } from "../constants";
import type { SponsorRow } from "../types";

const TIER_TONES: Record<SponsorTier, ActionTone> = {
  PLATINUM: "primary",
  GOLD: "warning",
  SILVER: "secondary",
  BRONZE: "default",
  SUPPORTER: "default",
};

const STATUS_TONES: Record<SponsorStatus, ActionTone> = {
  LEAD: "secondary",
  ACTIVE: "success",
  PAUSED: "warning",
  ENDED: "default",
};

export function SponsorTable({
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
  rows: SponsorRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("sponsors.table");
  const tTier = useTranslations("sponsors.tier");
  const tStatus = useTranslations("sponsors.status");
  const locale = useLocale();
  const moneyLocale = locale === "de" ? "de-DE" : "tr-TR";
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const [deleting, setDeleting] = useState<SponsorRow | null>(null);
  const [selection, setSelection] = useState<DataTableSelection>({ type: "explicit", ids: [] });
  const [bulkPending, setBulkPending] = useState(false);

  const runBulkStatus = async (currentSelection: DataTableSelection, status: SponsorStatus) => {
    setBulkPending(true);
    try {
      const result = await bulkChangeSponsorStatusAction({ selection: currentSelection, status });
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      notify.success(t("bulkSuccess", { updated: result.data.updated, skipped: result.data.skipped }));
      setSelection({ type: "explicit", ids: [] });
      router.refresh();
    } finally {
      setBulkPending(false);
    }
  };

  const columns: DataTableColumn<SponsorRow>[] = [
    { key: "name", label: t("name"), sortable: true },
    {
      key: "tier",
      label: t("tier"),
      sortable: true,
      render: (row) => <StatusChip tone={TIER_TONES[row.tier]}>{tTier(row.tier)}</StatusChip>,
    },
    {
      key: "status",
      label: t("status"),
      sortable: true,
      render: (row) => <StatusChip tone={STATUS_TONES[row.status]}>{tStatus(row.status)}</StatusChip>,
    },
    {
      key: "amountCents",
      label: t("amount"),
      sortable: true,
      render: (row) => (row.amountCents > 0 ? formatMoney(row.amountCents, moneyLocale) : "-"),
    },
    {
      key: "contactName",
      label: t("contact"),
      render: (row) => row.contactName ?? "-",
    },
    {
      key: "startDate",
      label: t("period"),
      render: (row) => {
        if (!row.startDate && !row.endDate) return "-";
        const from = row.startDate ? formatDate(row.startDate) : "-";
        const to = row.endDate ? formatDate(row.endDate) : "-";
        return `${from} – ${to}`;
      },
    },
  ];

  return (
    <>
      <DataTable<SponsorRow>
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
            key: "tier",
            label: t("tier"),
            options: SPONSOR_TIERS.map((tier) => ({ value: tier, label: tTier(tier) })),
          },
          {
            key: "status",
            label: t("status"),
            options: SPONSOR_STATUSES.map((status) => ({ value: status, label: tStatus(status) })),
          },
        ]}
        selection={
          canUpdate
            ? {
                mode: "multiple",
                value: selection,
                onChange: setSelection,
                allowQuerySelection: true,
                bulkActions: [
                  {
                    key: "activate",
                    label: t("bulkActivate"),
                    icon: <CircleCheck className="h-4 w-4" />,
                    disabled: bulkPending,
                    onPress: (currentSelection) => runBulkStatus(currentSelection, "ACTIVE"),
                  },
                  {
                    key: "pause",
                    label: t("bulkPause"),
                    icon: <PauseCircle className="h-4 w-4" />,
                    disabled: bulkPending,
                    onPress: (currentSelection) => runBulkStatus(currentSelection, "PAUSED"),
                  },
                  {
                    key: "end",
                    label: t("bulkEnd"),
                    icon: <CircleOff className="h-4 w-4" />,
                    disabled: bulkPending,
                    onPress: (currentSelection) => runBulkStatus(currentSelection, "ENDED"),
                  },
                ],
              }
            : undefined
        }
        emptyMessage={t("empty")}
        rowActions={(row) => [
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
        message={deleting ? t("deleteMessage", { name: deleting.name }) : ""}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteSponsorAction({ id: deleting.id });
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
