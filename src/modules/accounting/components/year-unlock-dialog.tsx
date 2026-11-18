"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Dialog, Label, Spinner, TextArea, TextField } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { unlockYearAction } from "../actions/year-actions";

/** Yıl kilidi açma diyaloğu (§ 11.6): gerekçe zorunlu, YEAR_UNLOCK audit. */
export function YearUnlockDialog({
  isOpen,
  onOpenChange,
  year,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
}) {
  const t = useTranslations("accounting.years");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await unlockYearAction({ year, reason });
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      notify.success(t("toastUnlocked", { year }));
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
                {t("unlockTitle", { year })}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
              <p className="text-sm text-ink-500">{t("unlockHint")}</p>
              <TextField
                value={reason}
                isRequired
                onChange={setReason}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("unlockReason")}</Label>
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
                {t("unlockConfirm")}
              </Button>
            </Dialog.Footer>
    </Dialog>
  );
}
