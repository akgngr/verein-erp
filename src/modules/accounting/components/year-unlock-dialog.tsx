"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea, addToast } from "@heroui/react";
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
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("toastUnlocked", { year }), color: "success" });
      onOpenChange(false);
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
      <ModalContent>
        <ModalHeader>{t("unlockTitle", { year })}</ModalHeader>
        <ModalBody>
          <p className="text-small text-default-500">{t("unlockHint")}</p>
          <Textarea
            label={t("unlockReason")}
            value={reason}
            onValueChange={setReason}
            maxLength={300}
            minRows={3}
            isRequired
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button color="danger" onPress={confirm} isLoading={busy} isDisabled={reason.trim().length < 5}>
            {t("unlockConfirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
