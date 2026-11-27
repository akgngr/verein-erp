"use client";

import { notify } from "@/shared/components/ui/notify";
import { DateInput, Description, Dialog, Input, Label, Select, Spinner, TextArea, TextField, Button } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Ban, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { getLocalTimeZone, today } from "@internationalized/date";

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
      notify.success(t("toastSaved", { receipt: result.data.receiptNumber }));
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
    const result = await voidPaymentAction({
      id: voidTarget.id,
      reason: voidReason,
    });
    if (!result.ok) {
      notify.error(describeActionError(result));
      return;
    }
    notify.success(t("toastVoided"));
    setVoidTarget(null);
    setVoidReason("");
  };

  return (
    <div className="rounded-lg border border-ink-200 bg-surface p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* #586: Karışık TR/DE başlık büyük harfe çevrilmez (Türkçe yerelde "MİTGLİEDSBEİTRÄGE" oluyordu). */}
        <h2 className="text-sm font-semibold tracking-wide text-ink-500">
          {t("title")}
        </h2>
        {canCreate ? (
          <Button
            size="sm"
            onPress={() => {
              setFormError(null);
              setAddOpen(true);
            }}
            variant={actionVariant("primary", "flat")}
          >
            {<Plus className="h-4 w-4" aria-hidden />}
            {t("add")}
          </Button>
        ) : null}
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-ink-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label={t("title")}>
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
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
                    className={`border-b border-ink-100 last:border-none${voided ? " text-ink-400 line-through decoration-danger-400" : ""}`}
                  >
                    <td className="py-2 pr-3 font-medium">
                      {/* Makbuz numarası üstü çizilmesin (okunurluk; KARAR). */}
                      <span
                        className={
                          voided ? "line-through decoration-danger-400" : ""
                        }
                      >
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
                    <td className="py-2 pr-3">
                      {t(`method.${payment.method}`)}
                    </td>
                    <td className="py-2 pr-3">{payment.paidAt}</td>
                    <td className="py-2 pr-3">
                      {voided ? (
                        <span className="font-medium text-danger">
                          {t("statusVoided")}
                          <span className="block text-xs font-normal normal-case">
                            {t("voidedInfo", {
                              date: payment.voidedAt
                                ? payment.voidedAt.slice(0, 10)
                                : "",
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
                            isIconOnly
                            aria-label={t("void")}
                            onPress={() => {
                              setVoidReason("");
                              setVoidTarget(payment);
                            }}
                            variant={actionVariant("danger", "flat")}
                          >
                            {<Ban className="h-4 w-4" aria-hidden />}
                          </Button>
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
      <Dialog isOpen={addOpen} onOpenChange={setAddOpen} size="lg" className={"w-full max-w-lg "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("form.title")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    value={dueYear}
                    onChange={setDueYear}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("form.dueYear")}</Label>
                    <Input
                      type="number"
                      min={2000}
                      max={new Date().getFullYear() + 1}
                    />
                  </TextField>
                  <TextField
                    value={amount}
                    onChange={setAmount}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("form.amount")}</Label>
                    <Input placeholder="120,00" inputMode="decimal" />
                  </TextField>
                  <Select
                    value={method}
                    onChange={(selectedValue) => {
                      const keys =
                        selectedValue === null
                          ? undefined
                          : String(selectedValue);
                      const key = keys as MethodKey | undefined;
                      if (key) setMethod(key);
                    }}
                  >
                    <Label>{t("form.method")}</Label>
                        {PAYMENT_METHODS.map((value) => (
                          <Select.Item
                            key={value}
                            id={value}
                            textValue={String(t(`method.${value}`))}
                          >
                            <Label>{t(`method.${value}`)}</Label>
                          </Select.Item>
                        ))}
                  </Select>
                  {/* KARAR: FormDatePicker kalıbı — değer "yyyy-MM-dd" string; CalendarDate'e çevrilir. */}
                  <DateInput label={t("form.paidAt")} ariaLabel={String(t("form.paidAt"))} value={paidAt} onChange={setPaidAt} minValue={joinDate} maxValue={today(getLocalTimeZone()).toString()} />
                  <TextField
                    value={reference}
                    onChange={setReference}
                    className={["sm:col-span-2"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("form.reference")}</Label>
                    <TextArea
                      maxLength={100}
                      rows={3}
                      className={["[field-sizing:content]"]
                        .filter(Boolean)
                        .join(" ")}
                    />
                    <Description>{t("form.referenceDescription")}</Description>
                  </TextField>
                </div>
                {formError ? (
                  <p className="mt-2 text-sm text-danger" role="alert">
                    {formError}
                  </p>
                ) : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setAddOpen(false)}
                  variant={actionVariant("default", "flat")}
                >
                  {t("form.cancel")}
                </Button>
                <Button
                  onPress={submitPayment}
                  variant={actionVariant("primary", "solid")}
                  isPending={saving}
                >
                  {saving ? <Spinner size="sm" tone="current" /> : null}
                  {t("form.save")}
                </Button>
              </Dialog.Footer>
      </Dialog>

      {/* İptal (void) diyaloğu */}
      <Dialog
        isOpen={voidTarget !== null}
        onOpenChange={(open) => !open && setVoidTarget(null)} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("voidTitle")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                <p className="text-sm text-ink-500">{t("voidConfirm")}</p>
                <TextField
                  value={voidReason}
                  isRequired
                  onChange={setVoidReason}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("voidReason")}</Label>
                  <TextArea
                    maxLength={300}
                    rows={3}
                    className={["[field-sizing:content]"]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </TextField>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setVoidTarget(null)}
                  variant={actionVariant("default", "flat")}
                >
                  {t("form.cancel")}
                </Button>
                <Button
                  onPress={submitVoid}
                  isDisabled={voidReason.trim().length < 5}
                  variant={actionVariant("danger", "solid")}
                >
                  {t("void")}
                </Button>
              </Dialog.Footer>
      </Dialog>
    </div>
  );
}
