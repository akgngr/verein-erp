"use client";

import { notify } from "@/shared/components/ui/notify";
import { Dialog, Input, Label, Spinner, TextField, Button } from "@/shared/components/kit";

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
        notify.error(result.error);
        return;
      }
      notify.success(labels.toast);
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
      <Dialog isOpen={open} onOpenChange={setOpen} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {labels.title} — {donorNumber}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
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
              </Dialog.Body>
              <Dialog.Footer>
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
                  {busy ? <Spinner size="sm" tone="current" /> : null}
                  {labels.button}
                </Button>
              </Dialog.Footer>
      </Dialog>
    </>
  );
}
