"use client";

import { Modal } from "@heroui/react";
import type { ReactNode } from "react";

import { DialogDismissButton } from "./dialog-dismiss-button";

/**
 * Shared, accessible form dialog shell.
 * Modules own validation, form state and actions; only the UI framework
 * structure stays in the shared layer.
 */
export function FormModal({
  isOpen,
  onOpenChange,
  title,
  children,
  footer,
  isSubmitting = false,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  isSubmitting?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop
        isDismissable={!isSubmitting}
        isKeyboardDismissDisabled={isSubmitting}
      >
        <Modal.Container size="md">
          <Modal.Dialog className="w-full max-w-md">
            {() => (
              <>
                <DialogDismissButton />
                <Modal.Header className="flex flex-col gap-1">
                  <Modal.Heading className="flex items-center gap-2">
                    {title}
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body>{children}</Modal.Body>
                <Modal.Footer>{footer}</Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
