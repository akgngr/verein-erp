"use client";

import { Button, DatePicker, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { parseDate, type DateValue } from "@internationalized/date";

import { formatMoney } from "@/shared/money";

import { generateDuesAction, type GenerateDuesResult } from "../actions/dues-actions";

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
        addToast({
          title: t("toastCreated", { count: result.data.created ?? 0 }),
          color: "success",
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
      <Button size="sm" color="primary" onPress={() => { setError(null); setOpen(true); }}>
        {t("open")}
      </Button>

      <Modal isOpen={open} onOpenChange={(next) => setOpen(next)} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("title")}</ModalHeader>
              <ModalBody>
                <p className="text-small text-default-500">{t("description")}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select
                    id="generate-dues-year"
                    label={t("year")}
                    labelPlacement="outside"
                    selectedKeys={[year]}
                    disallowEmptySelection
                    onSelectionChange={(keys) => {
                      const key = [...keys][0];
                      if (key) changeYear(String(key));
                    }}
                  >
                    {yearOptions.map((option) => (
                      <SelectItem key={String(option)} textValue={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </Select>
                  <DatePicker
                    id="generate-dues-date"
                    label={t("dueDate")}
                    labelPlacement="outside"
                    value={dueDate ? (parseDate(dueDate) as DateValue) : null}
                    onChange={(next) => setDueDate(next ? next.toString() : "")}
                  />
                </div>

                {preview ? (
                  <div className="rounded-medium border border-default-200 bg-default-50 p-3 text-small">
                    <p>
                      <span className="font-medium">{t("previewEligible")}:</span>{" "}
                      {preview.eligibleCount}
                    </p>
                    <p>
                      <span className="font-medium">{t("previewTotal")}:</span>{" "}
                      {formatMoney(preview.totalAmountCents)}
                    </p>
                    <p className="text-default-500">
                      {t("previewSkippedNoAmount")}: {preview.skippedNoAmountCount} ·{" "}
                      {t("previewSkippedExisting")}: {preview.skippedExistingCount}
                    </p>
                  </div>
                ) : null}

                {error ? <p className="text-small text-danger">{error}</p> : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t("cancel")}
                </Button>
                <Button
                  variant="flat"
                  color="primary"
                  isLoading={busy}
                  onPress={() => run(true)}
                >
                  {t("check")}
                </Button>
                <Button
                  color="primary"
                  isLoading={busy}
                  isDisabled={!preview || preview.eligibleCount === 0}
                  onPress={() => run(false)}
                >
                  {t("confirm")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
