"use client";

import { useTranslations } from "next-intl";

import { Button, addToast } from "@heroui/react";
import { CheckCircle2, Circle, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils";

import { deleteActionItemAction, setActionItemStatusAction } from "../actions/action-item-actions";
import { isActionItemOverdue } from "../utils";
import type { ActionItemRow } from "../types";

import { ActionItemModal } from "./action-item-modal";

/**
 * Toplantı görevleri sekmesi (7.3): açıklama, sorumlu, son tarih (gecikmiş
 * kırmızı), bağlı karar numarası, durum. "Tamamlandı / Yeniden aç" geçişi
 * onaylı toplantıda da çalışır (5. bölüm md. 4, actionStatus kapsamı).
 */
export function ActionItemsTab({
  meetingId,
  actionItems,
  decisions,
  userOptions,
  contentEditable,
}: {
  meetingId: string;
  actionItems: ActionItemRow[];
  decisions: { id: string; decisionNumber: string }[];
  userOptions: { id: string; label: string }[];
  contentEditable: boolean;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("meetings.tasks");
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ActionItemRow | null>(null);
  const [deleting, setDeleting] = useState<ActionItemRow | null>(null);

  const toggleStatus = async (item: ActionItemRow) => {
    const target = item.status === "DONE" ? "OPEN" : "DONE";
    const result = await setActionItemStatusAction({ id: item.id, status: target });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({
      title: target === "DONE" ? t("doneToast") : t("reopenedToast"),
      color: "success",
    });
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteActionItemAction({ id: deleting.id });
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
      {contentEditable ? (
        <div>
          <Button
            size="sm"
            color="primary"
            startContent={<Plus className="h-4 w-4" />}
            onPress={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            {t("add")}
          </Button>
        </div>
      ) : null}

      {actionItems.length === 0 ? (
        <p className="text-small text-default-500">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {actionItems.map((actionItem) => {
            const overdue = isActionItemOverdue(actionItem.status, actionItem.dueDate);
            const done = actionItem.status === "DONE";
            return (
              <li
                key={actionItem.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-medium border border-default-200 bg-content1 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-small ${done ? "text-default-400 line-through" : ""}`}>
                    {actionItem.description}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-tiny text-default-500">
                    <span>{actionItem.assigneeLabel ?? t("unassigned")}</span>
                    <span className={overdue ? "font-medium text-danger-600" : ""}>
                      Son tarih: {actionItem.dueDate ? formatDate(actionItem.dueDate) : "-"}
                      {overdue ? t("overdueShort") : ""}
                    </span>
                    {actionItem.decisionNumber ? (
                      <span>{t("decisionLine", { number: actionItem.decisionNumber })}</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="light"
                    color={done ? "warning" : "success"}
                    startContent={
                      done ? (
                        <Circle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )
                    }
                    onPress={() => toggleStatus(actionItem)}
                  >
                    {done ? t("reopen") : t("markDone")}
                  </Button>
                  {contentEditable ? (
                    <>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        aria-label={tCommon("edit")}
                        onPress={() => {
                          setEditing(actionItem);
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
                        onPress={() => setDeleting(actionItem)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ActionItemModal
        meetingId={meetingId}
        decisions={decisions}
        userOptions={userOptions}
        item={editing}
        isOpen={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteAria")}
        message={t("deleteNamedMessage", { description: deleting?.description ?? "" })}
        confirmLabel={tCommon("delete")}
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
