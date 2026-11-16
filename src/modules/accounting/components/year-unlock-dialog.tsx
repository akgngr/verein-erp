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
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(t("toastUnlocked", { year }), { variant: "success" });
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
                {t("unlockTitle", { year })}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
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
                {t("unlockConfirm")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
