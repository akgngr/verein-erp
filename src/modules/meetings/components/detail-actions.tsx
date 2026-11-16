"use client";
import { toast, Button, Spinner } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

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
      toast(result.error, { variant: "danger" });
      return;
    }
    toast(t("deletedToast", { number: meetingNumber }), { variant: "success" });
    setOpen(false);
    router.push("/toplantilar");
    router.refresh();
  };

  return (
    <>
      <Button
        onPress={() => setOpen(true)}
        variant={actionVariant("danger", "light")}
        isPending={busy}
      >
        {busy ? <Spinner size="sm" color="current" /> : null}
        {<Trash2 className="h-4 w-4" />}
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
