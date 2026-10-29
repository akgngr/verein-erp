"use client";

import { Button, addToast } from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { MeetingStatus } from "@prisma/client";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { PdfSplitButton } from "@/shared/components/ui/pdf-split-button";

import { deleteMeetingAction } from "../actions/meeting-actions";
import { StatusMenu } from "./status-menu";

/**
 * Detay başlığı aksiyonları (7.3): Düzenle (durum PLANNED/HELD + update),
 * durum menüsü (yalnızca yapılabilen geçişler), "Tutanak (PDF)" (her zaman
 * görünür, yeni sekmede açılır), Sil (delete + onaylanmamış).
 */
export function MeetingDetailActions({
  meetingId,
  meetingNumber,
  title,
  status,
  canUpdate,
  canApprove,
  canDelete,
  quorumRequired,
  quorumReached,
}: {
  meetingId: string;
  meetingNumber: string;
  title: string;
  status: MeetingStatus;
  canUpdate: boolean;
  canApprove: boolean;
  canDelete: boolean;
  quorumRequired: number | null;
  quorumReached: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("meetings");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const editAvailable = canUpdate && (status === "PLANNED" || status === "HELD");
  const deleteAvailable = canDelete && status !== "APPROVED";

  const remove = async () => {
    const result = await deleteMeetingAction({ id: meetingId });
    setDeleteOpen(false);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("list.deletedToast", { number: meetingNumber }), color: "success" });
    router.push("/toplantilar");
    router.refresh();
  };

  return (
    <>
      {/* Faz 4 (4.3): PDF dil seçimi — ana tıklama varsayılan dil, açılır menü de/tr. */}
      <PdfSplitButton
        buildHref={(lang) => `/api/meetings/${meetingId}/minutes-pdf?lang=${lang}`}
        label={t("actions.minutesPdf")}
        aria={t("actions.minutesPdfAria")}
      />

      {editAvailable ? (
        <Button
          as="a"
          size="sm"
          variant="bordered"
          startContent={<Pencil className="h-4 w-4" aria-hidden />}
          href={`/toplantilar/${meetingId}?duzenle`}
        >
          {t("common.edit")}
        </Button>
      ) : null}

      <StatusMenu
        meetingId={meetingId}
        meetingNumber={meetingNumber}
        status={status}
        canUpdate={canUpdate}
        canApprove={canApprove}
        quorumRequired={quorumRequired}
        quorumReached={quorumReached}
      />

      {deleteAvailable ? (
        <Button
          size="sm"
          variant="flat"
          color="danger"
          startContent={<Trash2 className="h-4 w-4" aria-hidden />}
          onPress={() => setDeleteOpen(true)}
        >
          {t("common.delete")}
        </Button>
      ) : null}

      <ConfirmDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("list.deleteTitle")}
        message={t("list.deleteMessage", { number: meetingNumber, title })}
        confirmLabel={t("common.delete")}
        confirmColor="danger"
        onConfirm={remove}
      />
    </>
  );
}
