"use client";
import {
  toast,
  Link as ActionLink,
  buttonVariants,
  Button,
} from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

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

  const editAvailable =
    canUpdate && (status === "PLANNED" || status === "HELD");
  const deleteAvailable = canDelete && status !== "APPROVED";

  const remove = async () => {
    const result = await deleteMeetingAction({ id: meetingId });
    setDeleteOpen(false);
    if (!result.ok) {
      toast(result.error, { variant: "danger" });
      return;
    }
    toast(t("list.deletedToast", { number: meetingNumber }), {
      variant: "success",
    });
    router.push("/toplantilar");
    router.refresh();
  };

  return (
    <>
      {/* Faz 4 (4.3): PDF dil seçimi — ana tıklama varsayılan dil, açılır menü de/tr. */}
      <PdfSplitButton
        buildHref={(lang) =>
          `/api/meetings/${meetingId}/minutes-pdf?lang=${lang}`
        }
        label={t("actions.minutesPdf")}
        aria={t("actions.minutesPdfAria")}
      />

      {editAvailable ? (
        <ActionLink
          href={`/toplantilar/${meetingId}?duzenle`}
          className={buttonVariants({
            variant: actionVariant("default", "bordered"),
            size: "sm",
          })}
        >
          {<Pencil className="h-4 w-4" aria-hidden />}
          {t("common.edit")}
        </ActionLink>
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
          onPress={() => setDeleteOpen(true)}
          variant={actionVariant("danger", "flat")}
        >
          {<Trash2 className="h-4 w-4" aria-hidden />}
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
