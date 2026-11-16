"use client";
import {
  toast,
  Button,
  Spinner,
  Modal,
  TextField,
  Label,
  TextArea,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { reverseBookingAction } from "../actions/booking-actions";

/** İptal (Storno) diyaloğu (§ 11.1 satır aksiyonu): neden 5-300 zorunlu. */
export function ReverseModal({
  isOpen,
  onOpenChange,
  bookingId,
  bookingNumber,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingNumber: string;
}) {
  const t = useTranslations("accounting.reverse");
  const tForm = useTranslations("accounting.form");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await reverseBookingAction({ id: bookingId, reason });
      if (!result.ok) {
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(tForm("toastReversed"), { variant: "success" });
      onOpenChange(false);
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                {t("title")} — {bookingNumber}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-ink-500">{t("hint")}</p>
              <TextField
                value={reason}
                isRequired
                onChange={setReason}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("reason")}</Label>
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
                onPress={() => onOpenChange(false)}
                variant={actionVariant("default", "flat")}
              >
                {t("cancel")}
              </Button>
              <Button
                onPress={confirm}
                isDisabled={reason.trim().length < 5}
                variant={actionVariant("danger", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" color="current" /> : null}
                {t("confirm")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
