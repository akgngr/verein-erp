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
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(toastTitle, { variant: "success" });
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
                {title} — {donationNumber}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
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
            </Modal.Body>
            <Modal.Footer>
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
                {busy ? <Spinner size="sm" color="current" /> : null}
                {confirmLabel}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
