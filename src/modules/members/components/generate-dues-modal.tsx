"use client";
import { Button, toast } from "@heroui/react";
import { DateInput, Dialog, Label, Select, Spinner } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";


import { formatMoney } from "@/shared/money";

import {
  generateDuesAction,
  type GenerateDuesResult,
} from "../actions/dues-actions";

/**
 * Toplu aidat üretim modalı (Faz 3 eklemeleri): yıl + son ödeme tarihi seçilir,
 * önce dry-run önizleme gösterilir, onayla gerçek üretim yapılır. İş emri
 * kuralı: iki kez çalıştırmak mükerrer satır oluşturmaz (önizleme sayar).
 */
export function GenerateDuesModal({ currentYear }: { currentYear: number }) {
  const t = useTranslations("members.dues.generate");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(String(currentYear));
  const [dueDate, setDueDate] = useState(`${currentYear}-12-31`);
  const [preview, setPreview] = useState<GenerateDuesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const changeYear = (next: string) => {
    setYear(next);
    setDueDate(`${next}-12-31`);
    setPreview(null);
  };

  const run = async (dryRun: boolean) => {
    setError(null);
    setBusy(true);
    try {
      const result = await generateDuesAction({ year, dueDate, dryRun });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (dryRun) {
        setPreview(result.data);
      } else {
        toast(t("toastCreated", { count: result.data.created ?? 0 }), {
          variant: "success",
        });
        setOpen(false);
        setPreview(null);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        onPress={() => {
          setError(null);
          setOpen(true);
        }}
        variant={actionVariant("primary", "solid")}
      >
        {t("open")}
      </Button>

      <Dialog isOpen={open} onOpenChange={(next) => setOpen(next)} size="lg" className={"w-full max-w-lg "}>
              {({ close: onClose }) => (
                <>
                  <DialogDismissButton />
                  <Dialog.Header>
                    <Dialog.Heading className="flex items-center gap-2">
                      {t("title")}
                    </Dialog.Heading>
                  </Dialog.Header>
                  <Dialog.Body>
                    <p className="text-sm text-ink-500">{t("description")}</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Select
                        isRequired
                        value={year}
                        onChange={(selectedValue) => {
                          const keys =
                            selectedValue === null
                              ? undefined
                              : String(selectedValue);
                          const key = keys;
                          if (key) changeYear(String(key));
                        }}
                      >
                        <Label>{t("year")}</Label>
                            {yearOptions.map((option) => (
                              <Select.Item
                                key={String(option)}
                                id={String(option)}
                                textValue={String(option)}
                              >
                                <Label>{option}</Label>
                              </Select.Item>
                            ))}
                      </Select>
                      <DateInput label={t("dueDate")} ariaLabel={String(t("dueDate"))} value={dueDate} onChange={setDueDate} />
                    </div>

                    {preview ? (
                      <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm">
                        <p>
                          <span className="font-medium">
                            {t("previewEligible")}:
                          </span>{" "}
                          {preview.eligibleCount}
                        </p>
                        <p>
                          <span className="font-medium">
                            {t("previewTotal")}:
                          </span>{" "}
                          {formatMoney(preview.totalAmountCents)}
                        </p>
                        <p className="text-ink-500">
                          {t("previewSkippedNoAmount")}:{" "}
                          {preview.skippedNoAmountCount} ·{" "}
                          {t("previewSkippedExisting")}:{" "}
                          {preview.skippedExistingCount}
                        </p>
                      </div>
                    ) : null}

                    {error ? (
                      <p className="text-sm text-danger">{error}</p>
                    ) : null}
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Button
                      onPress={onClose}
                      variant={actionVariant("default", "light")}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      onPress={() => run(true)}
                      variant={actionVariant("primary", "flat")}
                      isPending={busy}
                    >
                      {busy ? <Spinner size="sm" tone="current" /> : null}
                      {t("check")}
                    </Button>
                    <Button
                      isDisabled={!preview || preview.eligibleCount === 0}
                      onPress={() => run(false)}
                      variant={actionVariant("primary", "solid")}
                      isPending={busy}
                    >
                      {busy ? <Spinner size="sm" tone="current" /> : null}
                      {t("confirm")}
                    </Button>
                  </Dialog.Footer>
                </>
              )}
      </Dialog>
    </>
  );
}
