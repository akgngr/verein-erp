"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea, addToast } from "@heroui/react";
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
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: tForm("toastReversed"), color: "success" });
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
        <ModalHeader>
          {t("title")} — {bookingNumber}
        </ModalHeader>
        <ModalBody>
          <p className="text-small text-default-500">{t("hint")}</p>
          <Textarea
            label={t("reason")}
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
            {t("confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
