"use client";

import { FormSurface, useFormDrawerClose } from "@/shared/components/forms/form-drawer";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useTranslations } from "next-intl";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { createDonorAction, updateDonorAction } from "../actions/donor-actions";
import { donorCreateSchema, donorUpdateSchema } from "../schemas/donor";

type DonorFormValues = {
  type: "PERSON" | "ORGANIZATION";
  firstName: string;
  lastName: string;
  organizationName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  note: string;
  copyFromMemberId: string;
  id?: string;
  isActive?: boolean;
};

export function DonorForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: Partial<DonorFormValues>;
}) {
  const tDonors = useTranslations("donations.donors");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const t = useTranslations("donations.donors.form");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<DonorFormValues>({
    resolver: (mode === "edit"
      ? zodResolver(donorUpdateSchema)
      : zodResolver(donorCreateSchema)) as unknown as Resolver<DonorFormValues>,
    defaultValues: {
      type: initial?.type ?? "PERSON",
      firstName: initial?.firstName ?? "",
      lastName: initial?.lastName ?? "",
      organizationName: initial?.organizationName ?? "",
      street: initial?.street ?? "",
      postalCode: initial?.postalCode ?? "",
      city: initial?.city ?? "",
      country: initial?.country ?? "Deutschland",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      note: initial?.note ?? "",
      copyFromMemberId: initial?.copyFromMemberId ?? "",
      id: initial?.id,
      isActive: initial?.isActive,
    },
  });

  const donorType = form.watch("type");

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    if (mode === "edit" && values.id) {
      const result = await updateDonorAction({ ...values, id: values.id });
      if (!result.ok) {
        setFormError(applyActionResult(result, form.setError));
        return;
      }
      // Çekmecede: kapat (adres değişince sunucu verisi tazelenir); sayfada: detaya dön.
      if (closeDrawer) {
        closeDrawer();
      } else {
        router.push(`/bagislar/bagiscilar/${values.id}`);
        router.refresh();
      }
      return;
    }
    const result = await createDonorAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    router.push(`/bagislar/bagiscilar/${result.data.id}`);
    router.refresh();
  });

  return (
    <FormSurface className="max-w-3xl">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormSelect
            name="type"
            label={t("type")}
            control={form.control}
            isRequired
            options={[
              { value: "PERSON", label: t("typePERSON") },
              { value: "ORGANIZATION", label: t("typeORGANIZATION") },
            ]}
          />
          {donorType === "ORGANIZATION" ? (
            <FormInput name="organizationName" label={t("organizationName")} control={form.control} isRequired />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput name="firstName" label={t("firstName")} control={form.control} />
              <FormInput name="lastName" label={t("lastName")} control={form.control} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput name="street" label={t("street")} control={form.control} />
            <FormInput name="postalCode" label={t("postalCode")} control={form.control} />
            <FormInput name="city" label={t("city")} control={form.control} />
            <FormInput name="country" label={t("country")} control={form.control} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput name="email" label={t("email")} control={form.control} type="email" />
            <FormInput name="phone" label={t("phone")} control={form.control} />
          </div>
          <FormTextarea name="note" label={t("note")} control={form.control} />
          {mode === "create" ? (
            <FormInput
              name="copyFromMemberId"
              label={t("fromMember")}
              control={form.control}
              description={t("fromMemberHint")}
              placeholder={tDonors("memberNumberPlaceholder")}
            />
          ) : null}
          {formError ? (
            <p className="text-small text-danger" role="alert">
              {formError}
            </p>
          ) : null}
          <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("save")}</SubmitButton>
        </form>
    </FormSurface>
  );
}
