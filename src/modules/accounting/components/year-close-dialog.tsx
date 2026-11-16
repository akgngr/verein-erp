"use client";
import { toast, Button, Spinner, Modal } from "@heroui/react";
import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

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
  preview: {
    bookingCount: number;
    incomeCents: number;
    expenseCents: number;
    missingReceiptCount: number;
  };
}) {
  const t = useTranslations("accounting.years");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: "EUR",
    });

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await closeYearAction({ year });
      if (!result.ok) {
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(t("toastClosed", { year }), { variant: "success" });
      onOpenChange(false);
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
                {t("closeTitle", { year })}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm font-semibold">{t("closePreview")}</p>
              <ul className="text-sm text-ink-500">
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
              <p className="text-sm text-ink-500">{t("closeHint")}</p>
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
                variant={actionVariant("primary", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" color="current" /> : null}
                {t("closeConfirm")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
