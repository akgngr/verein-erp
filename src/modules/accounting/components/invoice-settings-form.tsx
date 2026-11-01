"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormSurface, useFormDrawerClose } from "@/shared/components/forms/form-drawer";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { saveInvoiceSettingsAction } from "../actions/invoice-actions";
import { INVOICE_TAX_RATES } from "../constants";
import type { InvoiceSettingsData } from "../queries/invoices";
import { invoiceSettingsSchema, type InvoiceSettingsInput } from "../schemas/invoice";

/** Fatura varsayılanları: KDV oranı, muafiyet notu, ödeme süresi, banka bilgisi, alt metin, gelir kategorisi. */
export function InvoiceSettingsForm({ settings, categoryOptions }: { settings: InvoiceSettingsData; categoryOptions: { value: string; label: string }[] }) {
  const t = useTranslations("accounting.invoices.settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<InvoiceSettingsInput>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues: {
      defaultTaxRate: String(settings.defaultTaxRate),
      taxNote: settings.taxNote ?? "",
      paymentDays: String(settings.paymentDays),
      bankDetails: settings.bankDetails ?? "",
      footerText: settings.footerText ?? "",
      incomeCategoryId: settings.incomeCategoryId ?? "",
      sellerVatId: settings.sellerVatId ?? "",
      iban: settings.iban ?? "",
      bic: settings.bic ?? "",
    },
  });
  const close = () => (closeDrawer ? closeDrawer() : router.push("/muhasebe/faturalar"));

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await saveInvoiceSettingsAction(values);
    if (!result.ok) return setFormError(applyActionResult(result, form.setError));
    addToast({ title: t("saved"), color: "success" });
    close();
  });

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect name="defaultTaxRate" label={t("defaultTaxRate")} control={form.control} options={INVOICE_TAX_RATES.map((rate) => ({ value: String(rate), label: `${rate} %` }))} />
          <FormInput name="paymentDays" label={t("paymentDays")} control={form.control} type="number" />
        </div>
        <FormInput name="taxNote" label={t("taxNote")} control={form.control} description={t("taxNoteHelp")} />
        <FormSelect name="incomeCategoryId" label={t("incomeCategory")} control={form.control} options={categoryOptions} />
        <FormTextarea name="bankDetails" label={t("bankDetails")} control={form.control} placeholder={t("bankDetailsPlaceholder")} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormInput name="sellerVatId" label={t("sellerVatId")} control={form.control} placeholder="DE123456789" />
          <FormInput name="iban" label={t("iban")} control={form.control} />
          <FormInput name="bic" label={t("bic")} control={form.control} />
        </div>
        <p className="text-tiny text-default-500">{t("xrechnungHint")}</p>
        <FormTextarea name="footerText" label={t("footerText")} control={form.control} />
        <FormErrorSummary message={formError} />
        <div className="flex items-center gap-2">
          <SubmitButton isSubmitting={form.formState.isSubmitting}>{tCommon("save")}</SubmitButton>
          <Button variant="light" onPress={close}>
            {tCommon("cancel")}
          </Button>
        </div>
      </form>
    </FormSurface>
  );
}
