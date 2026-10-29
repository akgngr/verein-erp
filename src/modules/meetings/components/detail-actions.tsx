"use client";

import { useTranslations } from "next-intl";

import { Button, addToast } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { deleteMeetingAction } from "../actions/meeting-actions";

/**
 * Toplantı silme düğmesi (7.3): onay penceresi; sunucuda delete yetkisi ve
 * APPROVED olmama koşulu yeniden denetlenir (5. bölüm md. 5).
 */
export function DeleteMeetingButton({
  meetingId,
  meetingNumber,
}: {
  meetingId: string;
  meetingNumber: string;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("meetings.list");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    setBusy(true);
    const result = await deleteMeetingAction({ id: meetingId });
    setBusy(false);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("deletedToast", { number: meetingNumber }), color: "success" });
    setOpen(false);
    router.push("/toplantilar");
    router.refresh();
  };

  return (
    <>
      <Button
        color="danger"
        variant="light"
        isLoading={busy}
        startContent={<Trash2 className="h-4 w-4" />}
        onPress={() => setOpen(true)}
      >
        {tCommon("delete")}
      </Button>
      <ConfirmDialog
        isOpen={open}
        onOpenChange={setOpen}
        title={t("deleteAction")}
        message={t("deleteNumberedMessage", { number: meetingNumber })}
        confirmLabel={tCommon("delete")}
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
}
