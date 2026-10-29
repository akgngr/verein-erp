"use client";

import { useTranslations } from "next-intl";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea, addToast } from "@heroui/react";
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
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: toastTitle, color: "success" });
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
          {title} — {donationNumber}
        </ModalHeader>
        <ModalBody>
          <p className="text-small text-default-500">{hint}</p>
          <Textarea
            label={reasonLabel}
            labelPlacement="outside"
            value={reason}
            onValueChange={setReason}
            maxLength={300}
            minRows={3}
            isRequired
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button color="danger" onPress={confirm} isLoading={busy} isDisabled={reason.trim().length < 5}>
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
