"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Dialog, Spinner } from "@/shared/components/kit";
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
        notify.error(result.error);
        return;
      }
      notify.success(t("toastClosed", { year }));
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} size="md" className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Dialog.Header>
              <Dialog.Heading className="flex items-center gap-2">
                {t("closeTitle", { year })}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
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
            </Dialog.Body>
            <Dialog.Footer>
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
                {busy ? <Spinner size="sm" tone="current" /> : null}
                {t("closeConfirm")}
              </Button>
            </Dialog.Footer>
    </Dialog>
  );
}
