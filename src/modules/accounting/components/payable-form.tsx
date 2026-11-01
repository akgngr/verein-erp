"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";
import { toCents } from "@/shared/money";

import { savePayableAction } from "../actions/payable-actions";
import type { PayableDetail } from "../queries/payables";
import { payableSchema, type PayableInput } from "../schemas/payable";

const iso = (date: Date | null) => (date ? new Date(date).toISOString().slice(0, 10) : "");
const money = (cents: number | undefined) => (cents ? (cents / 100).toFixed(2).replace(".", ",") : "");
const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
type Supplier = { id: string; number: number; name: string; address: string | null; vatId: string | null };

/** ACC-5 gelen fatura formu: e-faturadan önerilen değerler kontrol edilip onaylanır. */
export function PayableForm({ payable, suppliers, categories }: { payable: PayableDetail; suppliers: Supplier[]; categories: Array<{ value: string; label: string }> }) {
  const t = useTranslations("accounting.payables.form");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const rate = (value: number) => payable.byRate.find((group) => group.rate === value);
  const form = useForm<PayableInput>({
    resolver: zodResolver(payableSchema),
    defaultValues: {
      id: payable.id,
      contactId: payable.contactId ?? "",
      supplierName: payable.supplierName,
      supplierVatId: payable.supplierVatId ?? "",
      supplierTaxNumber: payable.supplierTaxNumber ?? "",
      supplierAddress: payable.supplierAddress ?? "",
      supplierIban: payable.supplierIban ?? "",
      number: payable.number ?? "",
      issueDate: iso(payable.issueDate),
      dueDate: iso(payable.dueDate),
      serviceDate: payable.serviceDate ?? "",
      categoryId: payable.categoryId ?? "",
      net19: money(rate(19)?.netCents),
      tax19: money(rate(19)?.taxCents),
      net7: money(rate(7)?.netCents),
      tax7: money(rate(7)?.taxCents),
      net0: money(rate(0)?.netCents),
      notes: payable.notes ?? "",
    },
  });

  // Cari seçilince ad, adres ve USt-IdNr. karttan doldurulur.
  const contactId = useWatch({ control: form.control, name: "contactId" });
  const [lastContact, setLastContact] = useState(form.getValues("contactId"));
  if (contactId !== lastContact) {
    setLastContact(contactId);
    const supplier = suppliers.find((item) => item.id === contactId);
    if (supplier) {
      form.setValue("supplierName", supplier.name);
      if (supplier.address) form.setValue("supplierAddress", supplier.address);
      if (supplier.vatId) form.setValue("supplierVatId", supplier.vatId);
    }
  }

  const values = useWatch({ control: form.control });
  const cents = (value?: string) => (value ? toCents(value) ?? 0 : 0);
  const tax19 = values.tax19 ? cents(values.tax19) : Math.round(cents(values.net19) * 0.19);
  const tax7 = values.tax7 ? cents(values.tax7) : Math.round(cents(values.net7) * 0.07);
  const gross = cents(values.net19) + cents(values.net7) + cents(values.net0) + tax19 + tax7;

  const onSubmit = form.handleSubmit(async (input) => {
    setFormError(null);
    const result = await savePayableAction(input);
    if (!result.ok) return setFormError(applyActionResult(result, form.setError));
    addToast({ title: t("saved"), color: "success" });
    router.replace(`/muhasebe/gelen-faturalar/${payable.id}`);
    router.refresh();
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {suppliers.length ? (
        <FormSelect name="contactId" label={t("contact")} control={form.control} options={[{ value: "", label: "—" }, ...suppliers.map((supplier) => ({ value: supplier.id, label: `${supplier.number} · ${supplier.name}` }))]} />
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormInput name="supplierName" label={t("supplierName")} control={form.control} isRequired />
        <FormInput name="number" label={t("number")} control={form.control} />
        <FormInput name="supplierVatId" label={t("supplierVatId")} control={form.control} />
        <FormInput name="supplierTaxNumber" label={t("supplierTaxNumber")} control={form.control} />
        <FormInput name="supplierIban" label={t("supplierIban")} control={form.control} />
        <FormSelect name="categoryId" label={t("category")} control={form.control} options={categories} isRequired />
        <FormDatePicker name="issueDate" label={t("issueDate")} control={form.control} isRequired />
        <FormDatePicker name="dueDate" label={t("dueDate")} control={form.control} />
        <FormInput name="serviceDate" label={t("serviceDate")} control={form.control} placeholder={t("serviceDatePlaceholder")} />
      </div>
      <FormTextarea name="supplierAddress" label={t("supplierAddress")} control={form.control} />
      <h3 className="text-small font-semibold">{t("amounts")}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <FormInput name="net19" label={t("net19")} control={form.control} placeholder="0,00" />
        <FormInput name="tax19" label={t("tax19")} control={form.control} placeholder={money(Math.round(cents(values.net19) * 0.19)) || "0,00"} />
        <FormInput name="net7" label={t("net7")} control={form.control} placeholder="0,00" />
        <FormInput name="tax7" label={t("tax7")} control={form.control} placeholder={money(Math.round(cents(values.net7) * 0.07)) || "0,00"} />
        <FormInput name="net0" label={t("net0")} control={form.control} placeholder="0,00" />
      </div>
      <p className="text-small font-semibold">{t("gross", { amount: euro(gross) })}</p>
      <FormTextarea name="notes" label={t("notes")} control={form.control} />
      <FormErrorSummary message={formError} />
      <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("submit")}</SubmitButton>
    </form>
  );
}
