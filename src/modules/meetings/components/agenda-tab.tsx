"use client";

import { useTranslations } from "next-intl";

import { Button, Link, addToast } from "@heroui/react";
import { ArrowDown, ArrowUp, MessageSquarePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import {
  deleteAgendaItemAction,
  moveAgendaItemAction,
} from "../actions/agenda-actions";
import type { AgendaItemDetail, DecisionItem } from "../types";

import { AgendaItemModal } from "./agenda-item-modal";
import { DiscussionEditor } from "./discussion-editor";

/**
 * Gündem sekmesi (7.3): sıralı liste; madde numarası, başlık, planlanan içerik,
 * açılır "Görüşmeler" bölümü ve bağlı kararlar. Düzenlenebilirken: ekle,
 * düzenle, yukarı/aşağı taşı, sil, "Karar ekle".
 */
export function AgendaTab({
  meetingId,
  items,
  decisions,
  editable,
  canDecide,
  agendaModalSlot,
}: {
  meetingId: string;
  items: AgendaItemDetail[];
  decisions: DecisionItem[];
  editable: boolean;
  canDecide: boolean;
  agendaModalSlot?: React.ReactNode;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("meetings.agenda");
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItemDetail | null>(null);
  const [deleting, setDeleting] = useState<AgendaItemDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const move = async (id: string, direction: "up" | "down") => {
    setBusy(true);
    const result = await moveAgendaItemAction({ id, direction });
    setBusy(false);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteAgendaItemAction({ id: deleting.id });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("deletedToast"), color: "success" });
    setDeleting(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            color="primary"
            startContent={<Plus className="h-4 w-4" />}
            onPress={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
          >
            {t("add")}
          </Button>
          {agendaModalSlot}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-small text-default-500">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item, index) => {
            const linked = decisions.filter((decision) => decision.agendaItemId === item.id);
            return (
              <li
                key={item.id}
                className="rounded-medium border border-default-200 bg-content1 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {item.position}. {item.title}
                    </p>
                    {item.description ? (
                      <p className="text-small text-default-600">{item.description}</p>
                    ) : null}
                  </div>
                  {editable ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        aria-label={t("moveUp")}
                        isDisabled={busy || index === 0}
                        onPress={() => move(item.id, "up")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        aria-label={t("moveDown")}
                        isDisabled={busy || index === items.length - 1}
                        onPress={() => move(item.id, "down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        aria-label={tCommon("edit")}
                        onPress={() => {
                          setEditingItem(item);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        aria-label={tCommon("delete")}
                        onPress={() => setDeleting(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <DiscussionEditor
                  itemId={item.id}
                  initialDiscussion={item.discussion}
                  editable={editable}
                />

                {linked.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-1 border-l-2 border-default-300 pl-3">
                    {linked.map((decision) => (
                      <p key={decision.id} className="text-small">
                        <span className="font-medium">{decision.decisionNumber}</span>{" "}
                        {decision.text}
                      </p>
                    ))}
                  </div>
                ) : null}

                {canDecide && editable ? (
                  <div className="mt-3">
                    <Link
                      href={`/toplantilar/${meetingId}?sekme=kararlar&gundem=${item.id}`}
                      size="sm"
                      className="inline-flex items-center gap-1 text-primary"
                    >
                      <MessageSquarePlus className="h-4 w-4" aria-hidden />
                      {t("addDecision")}
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <AgendaItemModal
        meetingId={meetingId}
        item={editingItem}
        isOpen={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingItem(null);
        }}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteItemAria")}
        message={t("deleteNamedMessage", { title: deleting?.title ?? "" })}
        confirmLabel={tCommon("delete")}
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
