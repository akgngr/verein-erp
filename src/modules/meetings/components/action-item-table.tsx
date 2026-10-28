"use client";

import { Link, addToast } from "@heroui/react";
import { CheckCircle2, Circle, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableRowAction,
} from "@/shared/components/data-table/types";
import { formatDate } from "@/shared/utils";

import { setActionItemStatusAction } from "../actions/action-item-actions";
import { ACTION_ITEM_STATUS_COLORS, ACTION_ITEM_STATUS_LABELS } from "../constants";
import { isActionItemOverdue } from "../utils";
import type { ActionItemRow } from "../types";

/** Durum rozeti (7.4). */
function StatusBadge({ status }: { status: ActionItemRow["status"] }) {
  const color = ACTION_ITEM_STATUS_COLORS[status];
  const colorClass =
    color === "success" ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-600";
  return (
    <span className={`rounded-small px-2 py-0.5 text-tiny ${colorClass}`}>
      {ACTION_ITEM_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Çapraz toplantı görev tablosu (7.4): Görev, Toplantı (bağlantı), Sorumlu,
 * Son tarih (gecikmiş kırmızı), Durum, Karar No; satır aksiyonu tamamlandı/
 * yeniden aç ve toplantıya git.
 */
export function ActionItemTable({
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
}: {
  rows: ActionItemRow[];
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
}) {
  const router = useRouter();
  // KARAR: satır aksiyonu DataTable'ın kendi menüsünde koşar; tablo düzeyinde
  // bekleme göstergesi yoktur (paylaşılan bileşen davranışı korunur).
  const [, setBusyId] = useState<string | null>(null);

  const toggle = async (row: ActionItemRow) => {
    setBusyId(row.id);
    const target = row.status === "DONE" ? "OPEN" : "DONE";
    const result = await setActionItemStatusAction({ id: row.id, status: target });
    setBusyId(null);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({
      title: target === "DONE" ? "Görev tamamlandı olarak işaretlendi" : "Görev yeniden açıldı",
      color: "success",
    });
    router.refresh();
  };

  const columns: DataTableColumn<ActionItemRow>[] = [
    {
      key: "description",
      label: "Görev",
      render: (row) => <span className="line-clamp-2">{row.description}</span>,
    },
    {
      key: "meetingNumber",
      label: "Toplantı",
      width: 190,
      render: (row) => (
        <Link href={`/toplantilar/${row.meetingId}`} size="sm">
          {row.meetingNumber} — {row.meetingTitle.length > 28 ? `${row.meetingTitle.slice(0, 28)}…` : row.meetingTitle}
        </Link>
      ),
    },
    {
      key: "assigneeLabel",
      label: "Sorumlu",
      width: 150,
      render: (row) => row.assigneeLabel ?? "-",
    },
    {
      key: "dueDate",
      label: "Son tarih",
      sortable: true,
      width: 140,
      render: (row) => {
        const overdue = isActionItemOverdue(row.status, row.dueDate);
        return row.dueDate ? (
          <span className={overdue ? "font-medium text-danger-600" : undefined}>
            {formatDate(row.dueDate)}
            {overdue ? " (gecikmiş)" : ""}
          </span>
        ) : (
          "-"
        );
      },
    },
    {
      key: "status",
      label: "Durum",
      sortable: true,
      width: 120,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "decisionNumber",
      label: "Karar No",
      width: 100,
      render: (row) => row.decisionNumber ?? "-",
    },
  ];

  const rowActions = (row: ActionItemRow): DataTableRowAction[] => [
    { key: "view", label: "Toplantıya git", icon: <Eye className="h-4 w-4" />, href: `/toplantilar/${row.meetingId}?sekme=gorevler` },
    ...(canUpdate
      ? [
          {
            key: "toggle",
            label: row.status === "DONE" ? "Yeniden aç" : "Tamamlandı olarak işaretle",
            icon:
              row.status === "DONE" ? (
                <Circle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              ),
            onPress: () => toggle(row),
          },
        ]
      : []),
  ];

  return (
    <DataTable<ActionItemRow>
      ariaLabel="Görev listesi"
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
      searchPlaceholder="Görev, sorumlu, toplantı ara…"
      rowActions={rowActions}
      emptyMessage="Görev bulunamadı."
    />
  );
}
