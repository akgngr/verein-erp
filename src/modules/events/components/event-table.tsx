"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Chip, addToast } from "@heroui/react"
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react"
import { DataTable } from "@/shared/components/data-table/data-table"
import type {
  DataTableColumn,
  DataTableFilter,
} from "@/shared/components/data-table/types"
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"
import type { EventRow } from "../types"
import { EVENT_TYPES, EVENT_STATUSES } from "../constants"
import { deleteEventAction } from "../actions/event-actions"
import { formatDateTimeTr } from "../helpers/event-helpers"
import { EventFormModal } from "./event-form-modal"

interface EventTableProps {
  items: EventRow[]
  total: number
  page: number
  pageSize: number
  sort?: string
  dir?: "asc" | "desc"
  q?: string
}

export function EventTable({
  items,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
}: EventTableProps) {
  const router = useRouter()
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<EventRow | null>(null)

  const handleDeleteConfirm = async () => {
    if (!deletingEvent) return
    const res = await deleteEventAction(deletingEvent.id)
    if (res.success) {
      addToast({
        title: `"${deletingEvent.title}" etkinliği silindi.`,
        color: "success",
      })
      setDeletingEvent(null)
      router.refresh()
    } else {
      addToast({
        title: res.error ?? "Etkinlik silinirken bir hata oluştu.",
        color: "danger",
      })
    }
  }

  const columns: DataTableColumn<EventRow>[] = [
    {
      key: "title",
      label: "Etkinlik",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col py-1">
          <Link
            href={`/events?detail=${row.id}`}
            className="font-semibold text-small text-foreground hover:text-primary transition-colors"
          >
            {row.title}
          </Link>
          {row.description && (
            <span className="text-tiny text-default-400 line-clamp-1 max-w-sm mt-0.5">
              {row.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "type",
      label: "Tür",
      sortable: true,
      width: 140,
      render: (row) => {
        const typeMeta = EVENT_TYPES.find((t) => t.value === row.type)
        return (
          <Chip size="sm" variant="flat" color="default">
            {typeMeta?.labelTr ?? row.type}
          </Chip>
        )
      },
    },
    {
      key: "status",
      label: "Durum",
      sortable: true,
      width: 140,
      render: (row) => {
        const statusColorMap: Record<
          string,
          "success" | "warning" | "default" | "danger"
        > = {
          PUBLISHED: "success",
          DRAFT: "warning",
          COMPLETED: "default",
          CANCELLED: "danger",
        }
        const statusMeta = EVENT_STATUSES.find((s) => s.value === row.status)
        return (
          <Chip
            size="sm"
            variant="dot"
            color={statusColorMap[row.status] ?? "default"}
          >
            {statusMeta?.labelTr ?? row.status}
          </Chip>
        )
      },
    },
    {
      key: "startDate",
      label: "Tarih & Zaman",
      sortable: true,
      width: 180,
      render: (row) => (
        <div className="flex flex-col text-small">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="h-3.5 w-3.5 text-default-400" />
            <span>{formatDateTimeTr(row.startDate)}</span>
          </div>
          {row.isPast && (
            <span className="text-tiny text-default-400 flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" /> Geçmiş etkinlik
            </span>
          )}
        </div>
      ),
    },
    {
      key: "location",
      label: "Konum",
      render: (row) =>
        row.isOnline ? (
          <div className="flex items-center gap-1.5 text-primary text-small">
            <Video className="h-3.5 w-3.5" />
            <span>Online Etkinlik</span>
          </div>
        ) : row.location ? (
          <div className="flex items-center gap-1.5 text-default-600 max-w-[200px] truncate text-small">
            <MapPin className="h-3.5 w-3.5 text-default-400 shrink-0" />
            <span className="truncate">{row.location}</span>
          </div>
        ) : (
          <span className="text-default-400 text-small italic">Belirtilmedi</span>
        ),
    },
    {
      key: "capacity",
      label: "Katılımcı / Kontenjan",
      width: 160,
      render: (row) => (
        <div className="flex items-center gap-2 text-small">
          <Users className="h-3.5 w-3.5 text-default-400" />
          <span className="font-semibold">{row.registeredCount}</span>
          <span className="text-default-400">/</span>
          <span className="text-default-500">
            {row.capacity ? `${row.capacity} kişi` : "Sınırsız"}
          </span>
        </div>
      ),
    },
  ]

  const filters: DataTableFilter[] = [
    {
      key: "type",
      label: "Tür",
      options: EVENT_TYPES.map((t) => ({ value: t.value, label: t.labelTr })),
    },
    {
      key: "status",
      label: "Durum",
      options: EVENT_STATUSES.map((s) => ({ value: s.value, label: s.labelTr })),
    },
    {
      key: "timeFilter",
      label: "Zaman",
      options: [
        { value: "all", label: "Tüm Zamanlar" },
        { value: "upcoming", label: "Yaklaşanlar" },
        { value: "past", label: "Geçmiş" },
      ],
    },
  ]

  return (
    <>
      <DataTable<EventRow>
        columns={columns}
        rows={items}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        searchPlaceholder="Etkinlik başlığı, açıklama veya konum ara..."
        filters={filters}
        rowActions={(row) => [
          {
            key: "detail",
            label: "Detayları Görüntüle",
            icon: <Eye className="h-4 w-4" />,
            href: `/events?detail=${row.id}`,
          },
          {
            key: "edit",
            label: "Düzenle",
            icon: <Pencil className="h-4 w-4" />,
            onPress: () => setEditingEvent(row),
          },
          {
            key: "delete",
            label: "Sil",
            icon: <Trash2 className="h-4 w-4" />,
            color: "danger",
            onPress: () => setDeletingEvent(row),
          },
        ]}
        emptyMessage="Henüz kayıtlı bir etkinlik bulunmuyor."
        ariaLabel="Etkinlikler tablosu"
      />

      {editingEvent && (
        <EventFormModal
          isOpen={Boolean(editingEvent)}
          onClose={() => setEditingEvent(null)}
          eventToEdit={editingEvent}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingEvent)}
        onOpenChange={(open) => !open && setDeletingEvent(null)}
        title="Etkinliği Sil"
        message={`"${deletingEvent?.title}" başlıklı etkinliği ve tüm katılımcı kayıtlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        confirmLabel="Sil"
        confirmColor="danger"
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
