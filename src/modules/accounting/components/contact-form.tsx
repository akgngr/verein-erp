"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast, Switch } from "@heroui/react";
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

import { createContactAction, updateContactAction } from "../actions/contact-actions";
import type { ContactRow } from "../queries/contacts";
import { contactSchema, type ContactInput } from "../schemas/contact";

/** ACC-3 cari kart formu. Numara kaydedilince DATEV aralığından otomatik verilir. */
export function ContactForm({ contact, defaultType = "CUSTOMER" }: { contact?: ContactRow; defaultType?: "CUSTOMER" | "SUPPLIER" }) {
  const t = useTranslations("accounting.contacts");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const [formError, setFormError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(contact?.isActive ?? true);
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      type: contact?.type ?? defaultType,
      name: contact?.name ?? "",
      contactPerson: contact?.contactPerson ?? "",
      address: contact?.address ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      vatId: contact?.vatId ?? "",
      paymentTermDays: contact?.paymentTermDays != null ? String(contact.paymentTermDays) : "",
      notes: contact?.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = contact ? await updateContactAction({ ...values, id: contact.id, isActive }) : await createContactAction(values);
    if (!result.ok) return setFormError(applyActionResult(result, form.setError));
    addToast({ title: t("saved"), color: "success" });
    if (closeDrawer) closeDrawer();
    else router.push("/muhasebe/cariler");
    router.refresh();
  });

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect
            name="type"
            label={t("fields.type")}
            control={form.control}
            isDisabled={Boolean(contact)}
            options={(["CUSTOMER", "SUPPLIER"] as const).map((value) => ({ value, label: t(`type.${value}`) }))}
            description={contact ? t("fields.numberFixed", { number: contact.number }) : t("fields.numberAuto")}
          />
          <FormInput name="name" label={t("fields.name")} control={form.control} isRequired />
          <FormInput name="contactPerson" label={t("fields.contactPerson")} control={form.control} />
          <FormInput name="email" label={t("fields.email")} control={form.control} type="email" />
          <FormInput name="phone" label={t("fields.phone")} control={form.control} type="tel" />
          <FormInput name="vatId" label={t("fields.vatId")} control={form.control} placeholder="DE123456789" />
          <FormInput name="paymentTermDays" label={t("fields.paymentTermDays")} control={form.control} description={t("fields.paymentTermHint")} />
        </div>
        <FormTextarea name="address" label={t("fields.address")} control={form.control} />
        <FormTextarea name="notes" label={t("fields.notes")} control={form.control} />
        {contact ? (
          <Switch isSelected={isActive} onValueChange={setIsActive}>
            <span className="text-small">{t("fields.isActive")}</span>
          </Switch>
        ) : null}
        <p className="text-tiny text-default-500">{t("privacy")}</p>
        <FormErrorSummary message={formError} />
        <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("save")}</SubmitButton>
      </form>
    </FormSurface>
  );
}
