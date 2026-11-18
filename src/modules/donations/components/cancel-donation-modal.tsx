"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Dialog, Label, Spinner, TextArea, TextField } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { cancelDonationAction } from "../actions/donation-actions";

/** Bağış iptal diyaloğu (§ 11 md. 7): neden 5-300; fişler ters kayıt edilir. */
export function CancelDonationModal({
  isOpen,
  onOpenChange,
  donationId,
  donationNumber,
  title,
  reasonLabel,
  hint,
  confirmLabel,
  toastTitle,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  donationId: string;
  donationNumber: string;
  title: string;
  reasonLabel: string;
  hint: string;
  confirmLabel: string;
  toastTitle: string;
}) {
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await cancelDonationAction({ id: donationId, reason });
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      notify.success(toastTitle);
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
                {title} — {donationNumber}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
              <p className="text-sm text-ink-500">{hint}</p>
              <TextField
                value={reason}
                isRequired
                onChange={setReason}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{reasonLabel}</Label>
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
                {tCommon("cancel")}
              </Button>
              <Button
                onPress={confirm}
                isDisabled={reason.trim().length < 5}
                variant={actionVariant("danger", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" tone="current" /> : null}
                {confirmLabel}
              </Button>
            </Dialog.Footer>
    </Dialog>
  );
}
