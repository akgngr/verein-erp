"use client";

import { Button, Modal, Spinner } from "@heroui/react";
import { actionVariant } from "./action-appearance";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  message,
  confirmLabel,
  cancelLabel,
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
  /** Hata yönetimi çağıran taraftadır (örn. toast ile bildirim). */
  onConfirm: () => Promise<void>;
}) {
  const [isPending, setIsPending] = useState(false);
  const tCommon = useTranslations("common");

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
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={!isPending}
        isKeyboardDismissDisabled={isPending}
      >
        <Modal.Container size="sm">
          <Modal.Dialog>
            {({ close: onClose }) => (
              <>
                <Modal.Header>
                  <Modal.Heading>{title}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <p className="text-sm text-ink-600">{message}</p>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="tertiary"
                    onPress={onClose}
                    isDisabled={isPending}
                  >
                    {cancelLabel ?? tCommon("cancel")}
                  </Button>
                  <Button
                    variant={actionVariant(confirmColor, "solid")}
                    isPending={isPending}
                    isDisabled={isPending}
                    onPress={() => void handleConfirm(onClose)}
                  >
                    {isPending ? <Spinner size="sm" color="current" /> : null}
                    {confirmLabel ?? tCommon("confirm")}
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
