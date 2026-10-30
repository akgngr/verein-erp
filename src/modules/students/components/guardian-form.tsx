"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormSurface, useFormDrawerClose } from "@/shared/components/forms/form-drawer";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { createGuardianAction, updateGuardianAction } from "../actions/guardian-actions";
import { guardianSchema, type GuardianInput } from "../schemas/guardian";
import type { GuardianRow } from "../types";
import { formatDateOnly } from "../utils";

/** Veli (DATEV Debitor) formu: kişi, adres, iletişim, banka ve SEPA bilgileri. */
export function GuardianForm({ guardian }: { guardian?: GuardianRow }) {
  const t = useTranslations("students.guardianForm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<GuardianInput>({
    resolver: zodResolver(guardianSchema),
    defaultValues: {
      salutation: guardian?.salutation ?? "",
      firstName: guardian?.firstName ?? "",
      lastName: guardian?.lastName ?? "",
      street: guardian?.street ?? "",
      houseNumber: guardian?.houseNumber ?? "",
      postalCode: guardian?.postalCode ?? "",
      city: guardian?.city ?? "",
      country: guardian?.country ?? "DE",
      email: guardian?.email ?? "",
      phone: guardian?.phone ?? "",
      iban: guardian?.iban ?? "",
      bic: guardian?.bic ?? "",
      accountHolder: guardian?.accountHolder ?? "",
      sepaMandateReference: guardian?.sepaMandateReference ?? "",
      sepaMandateDate: formatDateOnly(guardian?.sepaMandateDate),
      note: guardian?.note ?? "",
    },
  });

  const close = () => (closeDrawer ? closeDrawer() : router.push("/ogrenciler/veliler"));

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    if (guardian) {
      const result = await updateGuardianAction({ id: guardian.id, ...values });
      if (!result.ok) {
        setFormError(applyActionResult(result, form.setError));
        return;
      }
      addToast({ title: t("updated"), color: "success" });
    } else {
      const result = await createGuardianAction(values);
      if (!result.ok) {
        setFormError(applyActionResult(result, form.setError));
        return;
      }
      addToast({ title: t("created", { number: result.data.debtorNumber }), color: "success" });
    }
    close();
  });

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <FormInput name="salutation" label={t("salutation")} control={form.control} placeholder={t("salutationPlaceholder")} />
          </div>
          <div className="sm:col-span-2">
            <FormInput name="firstName" label={t("firstName")} control={form.control} isRequired />
          </div>
          <div className="sm:col-span-2">
            <FormInput name="lastName" label={t("lastName")} control={form.control} isRequired />
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <p className="text-small font-medium">{t("addressTitle")}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <FormInput name="street" label={t("street")} control={form.control} />
            </div>
            <div className="sm:col-span-2">
              <FormInput name="houseNumber" label={t("houseNumber")} control={form.control} />
            </div>
            <div className="sm:col-span-2">
              <FormInput name="postalCode" label={t("postalCode")} control={form.control} />
            </div>
            <div className="sm:col-span-3">
              <FormInput name="city" label={t("city")} control={form.control} />
            </div>
            <div className="sm:col-span-1">
              <FormInput name="country" label={t("country")} control={form.control} description={t("countryHelp")} />
            </div>
          </div>
        </section>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput name="email" label={t("email")} control={form.control} type="email" />
          <FormInput name="phone" label={t("phone")} control={form.control} type="tel" />
        </section>
        <section className="flex flex-col gap-3 rounded-medium border border-default-200 p-3">
          <p className="text-small font-medium">{t("bankTitle")}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput name="iban" label={t("iban")} control={form.control} />
            <FormInput name="bic" label={t("bic")} control={form.control} />
            <FormInput name="accountHolder" label={t("accountHolder")} control={form.control} />
            <FormInput name="sepaMandateReference" label={t("sepaMandateReference")} control={form.control} />
            <FormDatePicker name="sepaMandateDate" label={t("sepaMandateDate")} control={form.control} />
          </div>
        </section>
        <FormTextarea name="note" label={t("note")} control={form.control} />
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
