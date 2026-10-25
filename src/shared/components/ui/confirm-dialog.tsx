"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useState } from "react";

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  message,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  confirmColor = "primary",
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "default" | "primary" | "danger" | "warning";
  /** Hata yönetimi çağıran taraftadır (örn. addToast ile bildirim). */
  onConfirm: () => Promise<void>;
}) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async (onClose: () => void) => {
    try {
      setIsPending(true);
      await onConfirm();
      onClose();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm" isDismissable={!isPending}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
            <ModalBody>
              <p className="text-small text-default-600">{message}</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} isDisabled={isPending}>
                {cancelLabel}
              </Button>
              <Button
                color={confirmColor}
                isLoading={isPending}
                isDisabled={isPending}
                onPress={() => void handleConfirm(onClose)}
              >
                {confirmLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
