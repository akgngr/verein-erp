"use client";
import {
  toast,
  Link as ActionLink,
  buttonVariants,
  Button,
  Spinner,
  Modal,
  TextField,
  Label,
  TextArea,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Ban, FileDown, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  cancelConfirmationAction,
  reissueConfirmationAction,
} from "../actions/confirmation-actions";

/**
 * Bildirim detayı eylemleri (§ 15 md. 7): PDF, iptal (neden 5-300) ve iptal
 * edilmiş bildirim için "Yerine yenisini oluştur".
 */
export function ConfirmationActionsBar({
  id,
  confirmationNumber,
  canCancel,
  canReissue,
}: {
  id: string;
  confirmationNumber: string;
  canCancel: boolean;
  canReissue: boolean;
}) {
  const t = useTranslations("donations.confirmations");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    setBusy(true);
    try {
      const result = await cancelConfirmationAction({ id, reason });
      if (!result.ok) {
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(t("detail.cancelled"), { variant: "success" });
      setCancelOpen(false);
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const reissue = async () => {
    setBusy(true);
    try {
      const result = await reissueConfirmationAction({ id });
      if (!result.ok) {
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(t("detail.reissued", { number: result.data.confirmationNumber }), {
        variant: "success",
      });
      router.push(`/bagislar/bildirimler/${result.data.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <ActionLink
        href={`/api/donations/confirmations/${id}/pdf`}
        target="_blank"
        rel="noopener"
        className={buttonVariants({
          variant: actionVariant("primary", "bordered"),
          size: "sm",
        })}
      >
        {<FileDown className="h-4 w-4" aria-hidden />}
        {t("actions.pdf")}
      </ActionLink>
      {canReissue ? (
        <Button
          size="sm"
          onPress={reissue}
          variant={actionVariant("primary", "solid")}
          isPending={busy}
        >
          {busy ? <Spinner size="sm" color="current" /> : null}
          {busy ? null : <RefreshCcw className="h-4 w-4" aria-hidden />}
          {t("actions.replace")}
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          size="sm"
          onPress={() => setCancelOpen(true)}
          variant={actionVariant("danger", "flat")}
        >
          {<Ban className="h-4 w-4" aria-hidden />}
          {t("actions.cancel")}
        </Button>
      ) : null}

      <Modal isOpen={cancelOpen} onOpenChange={setCancelOpen}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  {t("cancelTitle")} — {confirmationNumber}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-ink-500">{t("cancelHint")}</p>
                <TextField
                  value={reason}
                  isRequired
                  onChange={setReason}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("cancelReason")}</Label>
                  <TextArea
                    maxLength={300}
                    rows={3}
                    className={["[field-sizing:content]"]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  onPress={() => setCancelOpen(false)}
                  variant={actionVariant("default", "flat")}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  onPress={cancel}
                  isDisabled={reason.trim().length < 5}
                  variant={actionVariant("danger", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" color="current" /> : null}
                  {t("actions.cancel")}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
