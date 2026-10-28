"use client";

import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, addToast } from "@heroui/react";
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
  labels: { button: string; title: string; hint: string; confirmLabel: string; toast: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await anonymizeDonorAction({ id: donorId, confirmDonorNumber: confirmText });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: labels.toast, color: "success" });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="flat" color="danger" onPress={() => setOpen(true)} isDisabled={retentionBlocked}>
        {labels.button}
      </Button>
      <Modal isOpen={open} onOpenChange={setOpen} size="md">
        <ModalContent>
          <ModalHeader>{labels.title} — {donorNumber}</ModalHeader>
          <ModalBody>
            <p className="text-small text-default-500">{labels.hint}</p>
            <Input
              label={labels.confirmLabel}
              labelPlacement="outside"
              value={confirmText}
              onValueChange={setConfirmText}
              isDisabled={retentionBlocked}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button
              color="danger"
              onPress={confirm}
              isLoading={busy}
              isDisabled={retentionBlocked || confirmText.trim().toUpperCase() !== donorNumber}
            >
              {labels.button}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
