"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, addToast } from "@heroui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { closeYearAction } from "../actions/year-actions";

/** Yıl kapanış önizleme + onay diyaloğu (§ 11.6). */
export function YearCloseDialog({
  isOpen,
  onOpenChange,
  year,
  preview,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  preview: { bookingCount: number; incomeCents: number; expenseCents: number; missingReceiptCount: number };
}) {
  const t = useTranslations("accounting.years");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await closeYearAction({ year });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("toastClosed", { year }), color: "success" });
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
      <ModalContent>
        <ModalHeader>{t("closeTitle", { year })}</ModalHeader>
        <ModalBody>
          <p className="text-small font-semibold">{t("closePreview")}</p>
          <ul className="text-small text-default-500">
            <li>
              {t("colBookings")}: {preview.bookingCount}
            </li>
            <li>
              {t("colIncome")}: {format(preview.incomeCents)}
            </li>
            <li>
              {t("colExpense")}: {format(preview.expenseCents)}
            </li>
            <li>
              {t("colMissing")}: {preview.missingReceiptCount}
            </li>
          </ul>
          <p className="text-small text-default-500">{t("closeHint")}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button color="primary" onPress={confirm} isLoading={busy}>
            {t("closeConfirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
