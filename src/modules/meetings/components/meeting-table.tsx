"use client";

import { Link, addToast } from "@heroui/react";
import { Eye, ListTodo, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableRowAction,
} from "@/shared/components/data-table/types";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils";

import { deleteMeetingAction } from "../actions/meeting-actions";
import type { MeetingStatus, MeetingType } from "@prisma/client";

import { TITLE_TRUNCATE_LENGTH } from "../constants";
import { StatusBadge, TypeBadge } from "./badges";

export type MeetingRow = {
  id: string;
  meetingNumber: string;
  type: MeetingType;
  title: string;
  meetingDate: Date;
  startTime: string | null;
  location: string | null;
  status: MeetingStatus;
  decisionCount: number;
  openActionItemCount: number;
};

/**
 * Toplantı listesi tablosu (7.1). Satır tıklaması yerine Toplantı No hücresi
 * bağlantıdır (Faz 0 sözleşmesi: paylaşılan tabloya satır-tıklama eklenmez).
 */
export function MeetingTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  filters,
  toolbarExtra,
  canUpdate,
  canDelete,
}: {
  rows: MeetingRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  filters?: DataTableFilter[];
  toolbarExtra?: React.ReactNode;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<MeetingRow | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteMeetingAction({ id: deleting.id });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: `Toplantı silindi: ${deleting.meetingNumber}`, color: "success" });
    setDeleting(null);
    router.refresh();
  };

  const columns: DataTableColumn<MeetingRow>[] = [
    {
      key: "meetingNumber",
      label: "Toplantı No",
      sortable: true,
      width: 140,
      render: (row) => (
        <Link href={`/toplantilar/${row.id}`} size="sm" className="font-medium">
          {row.meetingNumber}
        </Link>
      ),
    },
    {
      key: "type",
      label: "Tür",
      width: 150,
      render: (row) => <TypeBadge type={row.type} />,
    },
    {
      key: "title",
      label: "Başlık",
      sortable: true,
      render: (row) => (
        <span title={row.title}>
          {row.title.length > TITLE_TRUNCATE_LENGTH
            ? `${row.title.slice(0, TITLE_TRUNCATE_LENGTH)}…`
            : row.title}
        </span>
      ),
    },
    {
      key: "meetingDate",
      label: "Tarih",
      sortable: true,
      width: 150,
      render: (row) => (
        <span>
          {formatDate(row.meetingDate)}
          {row.startTime ? ` · ${row.startTime}` : ""}
        </span>
      ),
    },
    {
      key: "location",
      label: "Yer",
      width: 150,
      render: (row) => row.location ?? "-",
    },
    {
      key: "status",
      label: "Durum",
      sortable: true,
      width: 120,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "decisionCount",
      label: "Karar",
      align: "center",
      width: 80,
      render: (row) => row.decisionCount,
    },
    {
      key: "openActionItemCount",
      label: "Açık Görev",
      align: "center",
      width: 100,
      render: (row) =>
        row.openActionItemCount > 0 ? (
          <Link href={`/toplantilar/${row.id}?sekme=gorevler`} size="sm" className="text-warning">
            {row.openActionItemCount}
          </Link>
        ) : (
          0
        ),
    },
  ];

  const rowActions = (row: MeetingRow): DataTableRowAction[] => [
    { key: "view", label: "Görüntüle", icon: <Eye className="h-4 w-4" />, href: `/toplantilar/${row.id}` },
    ...(canUpdate && (row.status === "PLANNED" || row.status === "HELD")
      ? [
          {
            key: "edit",
            label: "Düzenle",
            icon: <Pencil className="h-4 w-4" />,
            href: `/toplantilar/${row.id}/duzenle`,
          },
        ]
      : []),
    ...(canUpdate
      ? [
          {
            key: "actions",
            label: "Görevler",
            icon: <ListTodo className="h-4 w-4" />,
            href: `/toplantilar/gorevler?q=${encodeURIComponent(row.meetingNumber)}`,
          },
        ]
      : []),
    ...(canDelete && row.status !== "APPROVED"
      ? [
          {
            key: "delete",
            label: "Sil",
            icon: <Trash2 className="h-4 w-4" />,
            color: "danger" as const,
            onPress: () => setDeleting(row),
          },
        ]
      : []),
  ];

  return (
    <>
      <DataTable<MeetingRow>
        ariaLabel="Toplantılar"
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        filters={filters}
        toolbarExtra={toolbarExtra}
        searchPlaceholder="Toplantı no, başlık, yer, gündem, karar ara…"
        rowActions={rowActions}
        emptyMessage="Toplantı bulunamadı."
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Toplantıyı sil"
        message={`"${deleting?.meetingNumber ?? ""}" numaralı toplantı silinecek. Silinen toplantı listelerde, aramada, istatistikte ve görev listesinde görünmez; numarası yeniden kullanılmaz. Onaylıyor musunuz?`}
        confirmLabel="Sil"
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
}
