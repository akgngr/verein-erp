"use client";
import { Button, toast } from "@heroui/react";
import { Dialog, Label, Spinner, TextArea, TextField } from "@/shared/components/kit";

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
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} size="md" className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Dialog.Header>
              <Dialog.Heading className="flex items-center gap-2">
                {t("title")} — {bookingNumber}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
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
            </Dialog.Body>
            <Dialog.Footer>
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
                {busy ? <Spinner size="sm" tone="current" /> : null}
                {t("confirm")}
              </Button>
            </Dialog.Footer>
    </Dialog>
  );
}
