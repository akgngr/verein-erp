"use client";
import {
  toast,
  Button,
  Spinner,
  Modal,
  TextField,
  Label,
  Input,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { anonymizeDonorAction } from "../actions/donor-actions";

/** Anonimleştirme diyaloğu (§ 11 md. 12): bağışçı numarası ile onay. */
export function AnonymizeDonorDialog({
  donorId,
  donorNumber,
  retentionBlocked,
  labels,
}: {
  donorId: string;
  donorNumber: string;
  retentionBlocked: boolean;
  labels: {
    button: string;
    title: string;
    hint: string;
    confirmLabel: string;
    toast: string;
  };
}) {
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await anonymizeDonorAction({
        id: donorId,
        confirmDonorNumber: confirmText,
      });
      if (!result.ok) {
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(labels.toast, { variant: "success" });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        onPress={() => setOpen(true)}
        isDisabled={retentionBlocked}
        variant={actionVariant("danger", "flat")}
      >
        {labels.button}
      </Button>
      <Modal isOpen={open} onOpenChange={setOpen}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  {labels.title} — {donorNumber}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-ink-500">{labels.hint}</p>
                <TextField
                  value={confirmText}
                  isDisabled={retentionBlocked}
                  onChange={setConfirmText}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{labels.confirmLabel}</Label>
                  <Input />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  onPress={() => setOpen(false)}
                  variant={actionVariant("default", "flat")}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  onPress={confirm}
                  isDisabled={
                    retentionBlocked ||
                    confirmText.trim().toUpperCase() !== donorNumber
                  }
                  variant={actionVariant("danger", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" color="current" /> : null}
                  {labels.button}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
