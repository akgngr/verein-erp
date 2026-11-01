"use client";

import {
  Button,
  DatePicker,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
  addToast,
} from "@heroui/react";
import { Ban, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { type DateValue, getLocalTimeZone, parseDate, today } from "@internationalized/date";

import { PdfSplitButton } from "@/shared/components/ui/pdf-split-button";

import type { PaymentRow } from "../types";
import { createPaymentAction } from "../actions/create-payment";
import { voidPaymentAction } from "../actions/void-payment";
import { describeActionError } from "@/shared/components/forms/action-result";

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "OTHER"] as const;

type MethodKey = (typeof PAYMENT_METHODS)[number];

/**
 * Üye detay aidat ödemeleri paneli (Faz 4, 4.6 — KARAR: aidat altyapısı Faz 3'te
 * yoktu; ödeme kaydı + makbuz PDF + iptal burada). Yetkiler sunucuda zorunlu;
 * butonlar yalnızca kısayoldur. Makbuz PDF split button (4.3) her satırda.
 */
export function PaymentsPanel({
  memberId,
  joinDate,
  payments,
  canCreate,
  canDelete,
}: {
  memberId: string;
  /** "yyyy-MM-dd": ödeme tarihi bundan önce olamaz (sunucu da denetler). */
  joinDate: string;
  payments: PaymentRow[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("members.payments");
  const [addOpen, setAddOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<PaymentRow | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Yeni ödeme formu değerleri (KARAR: paylaşılan form bileşenleri tek kayıt
  // kalıbına göre; bu küçük panelde ayrı state kullanmak daha basittir).
  const [dueYear, setDueYear] = useState(String(new Date().getFullYear()));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<MethodKey>("BANK_TRANSFER");
  const [paidAt, setPaidAt] = useState("");
  const [reference, setReference] = useState("");

  const submitPayment = async () => {
    setFormError(null);
    setSaving(true);
    try {
      const result = await createPaymentAction({
        memberId,
        dueYear,
        amount,
        method,
        paidAt,
        reference,
      });
      if (!result.ok) {
        setFormError(describeActionError(result));
        return;
      }
      addToast({ title: t("toastSaved", { receipt: result.data.receiptNumber }), color: "success" });
      setAddOpen(false);
      setAmount("");
      setReference("");
      setPaidAt("");
    } finally {
      setSaving(false);
    }
  };

  const submitVoid = async () => {
    if (!voidTarget) return;
    const result = await voidPaymentAction({ id: voidTarget.id, reason: voidReason });
    if (!result.ok) {
      addToast({ title: describeActionError(result), color: "danger" });
      return;
    }
    addToast({ title: t("toastVoided"), color: "success" });
    setVoidTarget(null);
    setVoidReason("");
  };

  return (
    <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-small font-semibold uppercase tracking-wide text-default-500">
          {t("title")}
        </h2>
        {canCreate ? (
          <Button
            size="sm"
            color="primary"
            variant="flat"
            startContent={<Plus className="h-4 w-4" aria-hidden />}
            onPress={() => {
              setFormError(null);
              setAddOpen(true);
            }}
          >
            {t("add")}
          </Button>
        ) : null}
      </div>

      {payments.length === 0 ? (
        <p className="text-small text-default-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-small" aria-label={t("title")}>
            <thead>
              <tr className="border-b border-default-200 text-left text-tiny uppercase tracking-wide text-default-400">
                <th className="py-2 pr-3">{t("colReceipt")}</th>
                <th className="py-2 pr-3">{t("colDueYear")}</th>
                <th className="py-2 pr-3">{t("colAmount")}</th>
                <th className="py-2 pr-3">{t("colMethod")}</th>
                <th className="py-2 pr-3">{t("colPaidAt")}</th>
                <th className="py-2 pr-3">{t("colStatus")}</th>
                <th className="py-2" aria-label="" />
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const voided = payment.voidedAt !== null;
                return (
                  <tr
                    key={payment.id}
                    className={`border-b border-default-100 last:border-none${voided ? " text-default-400 line-through decoration-danger-400" : ""}`}
                  >
                    <td className="py-2 pr-3 font-medium">
                      {/* Makbuz numarası üstü çizilmesin (okunurluk; KARAR). */}
                      <span className={voided ? "line-through decoration-danger-400" : ""}>
                        {payment.receiptNumber}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{payment.dueYear}</td>
                    <td className="py-2 pr-3">
                      {(payment.amountCents / 100).toLocaleString("tr-TR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </td>
                    <td className="py-2 pr-3">{t(`method.${payment.method}`)}</td>
                    <td className="py-2 pr-3">{payment.paidAt}</td>
                    <td className="py-2 pr-3">
                      {voided ? (
                        <span className="font-medium text-danger">
                          {t("statusVoided")}
                          <span className="block text-tiny font-normal normal-case">
                            {t("voidedInfo", {
                              date: payment.voidedAt ? payment.voidedAt.slice(0, 10) : "",
                              reason: payment.voidReason ?? "",
                            })}
                          </span>
                        </span>
                      ) : (
                        t("statusActive")
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-2">
                        {!voided ? (
                          <PdfSplitButton
                            buildHref={(lang) =>
                              `/api/members/${memberId}/receipt-pdf?payment=${payment.id}&lang=${lang}`
                            }
                            label={t("receiptPdf")}
                            aria={t("receiptPdf")}
                          />
                        ) : null}
                        {!voided && canDelete ? (
                          <Button
                            size="sm"
                            variant="flat"
                            color="danger"
                            isIconOnly
                            aria-label={t("void")}
                            startContent={<Ban className="h-4 w-4" aria-hidden />}
                            onPress={() => {
                              setVoidReason("");
                              setVoidTarget(payment);
                            }}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Yeni ödeme diyaloğu */}
      <Modal isOpen={addOpen} onOpenChange={setAddOpen} size="lg">
        <ModalContent>
          <ModalHeader>{t("form.title")}</ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t("form.dueYear")}
                labelPlacement="outside"
                type="number"
                value={dueYear}
                onValueChange={setDueYear}
                min={2000}
                max={new Date().getFullYear() + 1}
              />
              <Input
                label={t("form.amount")}
                labelPlacement="outside"
                value={amount}
                onValueChange={setAmount}
                placeholder="120,00"
                inputMode="decimal"
              />
              <Select
                label={t("form.method")}
                labelPlacement="outside"
                selectedKeys={[method]}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0] as MethodKey | undefined;
                  if (key) setMethod(key);
                }}
              >
                {PAYMENT_METHODS.map((value) => (
                  <SelectItem key={value}>{t(`method.${value}`)}</SelectItem>
                ))}
              </Select>
              {/* KARAR: FormDatePicker kalıbı — değer "yyyy-MM-dd" string; CalendarDate'e çevrilir. */}
              <DatePicker
                showMonthAndYearPickers
                label={t("form.paidAt")}
                labelPlacement="outside"
                value={(() => {
                  if (!paidAt) return null;
                  try {
                    return parseDate(paidAt) as DateValue;
                  } catch {
                    return null;
                  }
                })()}
                onChange={(next) => setPaidAt(next ? next.toString() : "")}
                minValue={parseDate(joinDate) as DateValue}
                maxValue={today(getLocalTimeZone()) as DateValue}
              />
              <Textarea
                label={t("form.reference")}
                labelPlacement="outside"
                description={t("form.referenceDescription")}
                value={reference}
                onValueChange={setReference}
                maxLength={100}
                className="sm:col-span-2"
              />
            </div>
            {formError ? (
              <p className="mt-2 text-small text-danger" role="alert">
                {formError}
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setAddOpen(false)}>
              {t("form.cancel")}
            </Button>
            <Button color="primary" onPress={submitPayment} isLoading={saving}>
              {t("form.save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* İptal (void) diyaloğu */}
      <Modal isOpen={voidTarget !== null} onOpenChange={(open) => !open && setVoidTarget(null)} size="md">
        <ModalContent>
          <ModalHeader>{t("voidTitle")}</ModalHeader>
          <ModalBody>
            <p className="text-small text-default-500">{t("voidConfirm")}</p>
            <Textarea
              label={t("voidReason")}
              labelPlacement="outside"
              value={voidReason}
              onValueChange={setVoidReason}
              maxLength={300}
              minRows={3}
              isRequired
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setVoidTarget(null)}>
              {t("form.cancel")}
            </Button>
            <Button color="danger" onPress={submitVoid} isDisabled={voidReason.trim().length < 5}>
              {t("void")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
