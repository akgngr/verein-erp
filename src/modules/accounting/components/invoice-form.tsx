"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast, Button } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormSurface, useFormDrawerClose } from "@/shared/components/forms/form-drawer";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";
import { toCents } from "@/shared/money";

import { createInvoiceAction, updateInvoiceAction } from "../actions/invoice-actions";
import { INVOICE_KIND_VALUES, INVOICE_TAX_RATES } from "../constants";
import type { InvoiceDetail, InvoiceSettingsData } from "../queries/invoices";
import { invoiceSchema, parseDecimal, type InvoiceInput } from "../schemas/invoice";
import { calculateInvoiceTotals } from "../services/invoice-calc";
import type { ContactOption } from "../types";

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const priceInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** Fatura / proforma formu: kalemler eklenip çıkarılır, toplamlar anlık hesaplanır. Yalnızca taslak düzenlenir. */
export function InvoiceForm({
  invoice,
  kind,
  settings,
  categoryOptions,
  contacts = [],
}: {
  invoice?: InvoiceDetail;
  kind?: "INVOICE" | "PROFORMA" | "QUOTE";
  settings: InvoiceSettingsData;
  categoryOptions: { value: string; label: string }[];
  /** ACC-3: müşteri cari kartları; seçilince alıcı alanları ve vade doldurulur. */
  contacts?: ContactOption[];
}) {
  const t = useTranslations("accounting.invoices.form");
  const tKind = useTranslations("accounting.invoices.kind");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const [formError, setFormError] = useState<string | null>(null);
  const today = new Date();
  const due = new Date(today.getTime() + settings.paymentDays * 86_400_000);

  const form = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice
      ? {
          kind: invoice.kind,
          issueDate: isoDate(invoice.issueDate),
          dueDate: invoice.dueDate ? isoDate(invoice.dueDate) : "",
          serviceDate: invoice.serviceDate ?? "",
          recipientName: invoice.recipientName,
          recipientAddress: invoice.recipientAddress ?? "",
          recipientEmail: invoice.recipientEmail ?? "",
          subject: invoice.subject ?? "",
          introText: invoice.introText ?? "",
          footerText: invoice.footerText ?? "",
          taxNote: invoice.taxNote ?? "",
          categoryId: invoice.categoryId ?? "",
          contactId: invoice.contactId ?? "",
          buyerReference: invoice.buyerReference ?? "",
          lines: invoice.lines.map((line) => ({
            description: line.description,
            quantity: String(line.quantity).replace(".", ","),
            unit: line.unit ?? "",
            unitPrice: priceInput(line.unitPriceCents),
            taxRate: String(line.taxRate),
          })),
        }
      : {
          kind: kind ?? "INVOICE",
          issueDate: isoDate(today),
          dueDate: isoDate(due),
          serviceDate: "",
          recipientName: "",
          recipientAddress: "",
          recipientEmail: "",
          subject: "",
          introText: "",
          footerText: settings.footerText ?? "",
          taxNote: settings.taxNote ?? "",
          categoryId: settings.incomeCategoryId ?? "",
          contactId: "",
          buyerReference: "",
          lines: [{ description: "", quantity: "1", unit: "", unitPrice: "", taxRate: String(settings.defaultTaxRate) }],
        },
  });
  // Cari seçimi DEĞİŞİNCE alıcı alanları ve vade karttan doldurulur (sonra elle düzenlenebilir).
  const contactId = useWatch({ control: form.control, name: "contactId" });
  const [lastContactId, setLastContactId] = useState(form.getValues("contactId"));
  if (contactId !== lastContactId) {
    setLastContactId(contactId);
    const contact = contacts.find((item) => item.id === contactId);
    if (contact) {
      form.setValue("recipientName", contact.name);
      form.setValue("recipientAddress", contact.address ?? "");
      form.setValue("recipientEmail", contact.email ?? "");
      const days = contact.paymentTermDays ?? settings.paymentDays;
      const issue = new Date(`${form.getValues("issueDate") || isoDate(today)}T00:00:00Z`);
      form.setValue("dueDate", isoDate(new Date(issue.getTime() + days * 86_400_000)));
    }
  }
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const totals = calculateInvoiceTotals(
    lines.map((line) => ({
      quantity: Number.isFinite(parseDecimal(line?.quantity ?? "")) ? parseDecimal(line?.quantity ?? "") : 0,
      unitPriceCents: toCents(line?.unitPrice ?? "") ?? 0,
      taxRate: Number(line?.taxRate ?? 0),
    })),
  );

  const close = () => (closeDrawer ? closeDrawer() : router.push("/muhasebe/faturalar"));

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = invoice ? await updateInvoiceAction({ id: invoice.id, ...values }) : await createInvoiceAction(values);
    if (!result.ok) return setFormError(applyActionResult(result, form.setError));
    addToast({ title: invoice ? t("updated") : t("created"), color: "success" });
    if (invoice) return close();
    router.push(`/muhasebe/faturalar/${result.data.id}`);
  });

  const taxOptions = INVOICE_TAX_RATES.map((rate) => ({ value: String(rate), label: `${rate} %` }));

  return (
    <FormSurface className="max-w-3xl">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect name="kind" label={t("kind")} control={form.control} options={INVOICE_KIND_VALUES.map((value) => ({ value, label: tKind(value) }))} isRequired />
          <FormSelect name="categoryId" label={t("category")} control={form.control} options={categoryOptions} description={t("categoryHelp")} />
          <FormDatePicker name="issueDate" label={t("issueDate")} control={form.control} isRequired />
          <FormDatePicker name="dueDate" label={t("dueDate")} control={form.control} />
          <FormInput name="serviceDate" label={t("serviceDate")} control={form.control} placeholder={t("serviceDatePlaceholder")} />
          <FormInput name="subject" label={t("subject")} control={form.control} />
          <FormInput name="buyerReference" label={t("buyerReference")} control={form.control} description={t("buyerReferenceHint")} />
        </div>

        <h3 className="text-small font-semibold text-foreground">{t("recipientTitle")}</h3>
        {contacts.length ? (
          <FormSelect
            name="contactId"
            label={t("contact")}
            control={form.control}
            description={t("contactHelp")}
            options={[{ value: "", label: "—" }, ...contacts.map((contact) => ({ value: contact.id, label: `${contact.number} · ${contact.name}` }))]}
          />
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput name="recipientName" label={t("recipientName")} control={form.control} isRequired />
          <FormInput name="recipientEmail" label={t("recipientEmail")} control={form.control} type="email" />
        </div>
        <FormTextarea name="recipientAddress" label={t("recipientAddress")} control={form.control} placeholder={t("recipientAddressPlaceholder")} />
        <FormTextarea name="introText" label={t("introText")} control={form.control} />

        <h3 className="text-small font-semibold text-foreground">{t("linesTitle")}</h3>
        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 items-start gap-x-3 gap-y-2 rounded-medium border border-default-200 p-3">
              <div className="col-span-12">
                <FormInput name={`lines.${index}.description`} label={t("lineDescription")} control={form.control} isRequired />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <FormInput name={`lines.${index}.quantity`} label={t("quantity")} control={form.control} isRequired />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <FormInput name={`lines.${index}.unit`} label={t("unit")} control={form.control} />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <FormInput name={`lines.${index}.unitPrice`} label={t("unitPrice")} control={form.control} isRequired />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <FormSelect name={`lines.${index}.taxRate`} label={t("taxRate")} control={form.control} options={taxOptions} />
              </div>
              <div className="col-span-12 flex items-center justify-end gap-2 self-end sm:col-span-3 sm:h-10">
                <span className="text-small font-semibold tabular-nums">{euro(totals.lineTotals[index] ?? 0)}</span>
                <Button isIconOnly size="sm" variant="light" color="danger" aria-label={t("removeLine")} isDisabled={fields.length === 1} onPress={() => remove(index)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="flat"
            size="sm"
            className="self-start"
            startContent={<Plus className="h-4 w-4" aria-hidden />}
            onPress={() => append({ description: "", quantity: "1", unit: "", unitPrice: "", taxRate: String(settings.defaultTaxRate) })}
          >
            {t("addLine")}
          </Button>
        </div>

        <div className="ml-auto flex w-full max-w-xs flex-col gap-1 rounded-medium bg-default-50 p-3 text-small">
          <div className="flex justify-between"><span>{t("net")}</span><span>{euro(totals.netCents)}</span></div>
          {totals.byRate.filter((row) => row.rate > 0).map((row) => (
            <div key={row.rate} className="flex justify-between"><span>{t("tax", { rate: row.rate })}</span><span>{euro(row.taxCents)}</span></div>
          ))}
          <div className="flex justify-between border-t border-default-200 pt-1 font-semibold"><span>{t("gross")}</span><span>{euro(totals.grossCents)}</span></div>
        </div>

        <FormInput name="taxNote" label={t("taxNote")} control={form.control} description={t("taxNoteHelp")} />
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
