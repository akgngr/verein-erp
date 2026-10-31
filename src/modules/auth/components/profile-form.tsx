"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast, Checkbox, Divider } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSwitch } from "@/shared/components/forms/form-switch";
import { SubmitButton } from "@/shared/components/forms/submit-button";
import type { ActionResult } from "@/shared/types/action";

import { profileSchema, type ProfileData, type ProfileInput } from "../schemas/profile";

/**
 * Kullanıcının kendi profili. IBAN ve vergi numarası sunucudan yalnızca MASKELİ gelir;
 * alan boş bırakılırsa kayıtlı değer korunur, yeni değer yazılırsa şifreli olarak değiştirilir.
 */
export function ProfileForm({
  profile,
  saveAction,
}: {
  profile: ProfileData;
  saveAction: (input: unknown) => Promise<ActionResult>;
}) {
  const t = useTranslations("auth.profileForm");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const { ibanMasked, taxNumberMasked, updatedAt: _updatedAt, ...rest } = profile;
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { ...rest, iban: "", taxNumber: "", clearIban: false, clearTaxNumber: false },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await saveAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    form.reset({ ...values, iban: "", taxNumber: "", clearIban: false, clearTaxNumber: false });
    addToast({ title: t("saved"), color: "success" });
    router.refresh();
  });

  const section = (title: string, hint?: string) => (
    <div className="col-span-full flex flex-col gap-1 pt-2">
      <h3 className="text-small font-semibold">{title}</h3>
      {hint ? <p className="text-tiny text-default-500">{hint}</p> : null}
    </div>
  );

  return (
    <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit} noValidate>
      {section(t("contact"))}
      <FormInput name="phone" label={t("phone")} control={form.control} type="tel" autoComplete="tel" />
      <FormInput name="mobile" label={t("mobile")} control={form.control} type="tel" autoComplete="tel" />

      <Divider className="col-span-full" />
      {section(t("address"))}
      <FormInput name="street" label={t("street")} control={form.control} autoComplete="address-line1" />
      <FormInput name="houseNumber" label={t("houseNumber")} control={form.control} />
      <FormInput name="postalCode" label={t("postalCode")} control={form.control} autoComplete="postal-code" />
      <FormInput name="city" label={t("city")} control={form.control} autoComplete="address-level2" />
      <FormInput name="country" label={t("country")} control={form.control} description={t("countryHint")} />

      <Divider className="col-span-full" />
      {section(t("payment"), t("paymentHint"))}
      <FormInput name="accountHolder" label={t("accountHolder")} control={form.control} />
      <FormInput
        name="iban"
        label={t("iban")}
        control={form.control}
        autoComplete="off"
        placeholder={ibanMasked ?? undefined}
        description={ibanMasked ? t("keepHint") : undefined}
      />
      <FormInput name="bic" label={t("bic")} control={form.control} />
      <FormInput name="bankName" label={t("bankName")} control={form.control} />
      {ibanMasked ? (
        <Controller
          name="clearIban"
          control={form.control}
          render={({ field }) => (
            <Checkbox className="col-span-full" isSelected={field.value} onValueChange={field.onChange} color="danger" size="sm">
              {t("clearIban")}
            </Checkbox>
          )}
        />
      ) : null}

      <Divider className="col-span-full" />
      {section(t("invoice"), t("invoiceHint"))}
      <FormInput name="businessName" label={t("businessName")} control={form.control} />
      <FormInput
        name="taxNumber"
        label={t("taxNumber")}
        control={form.control}
        autoComplete="off"
        placeholder={taxNumberMasked ?? undefined}
        description={taxNumberMasked ? t("keepHint") : undefined}
      />
      <FormInput name="vatId" label={t("vatId")} control={form.control} />
      <div className="flex items-end">
        <FormSwitch name="isSmallBusiness" label={t("isSmallBusiness")} control={form.control} description={t("isSmallBusinessHint")} />
      </div>
      {taxNumberMasked ? (
        <Controller
          name="clearTaxNumber"
          control={form.control}
          render={({ field }) => (
            <Checkbox className="col-span-full" isSelected={field.value} onValueChange={field.onChange} color="danger" size="sm">
              {t("clearTaxNumber")}
            </Checkbox>
          )}
        />
      ) : null}

      <p className="col-span-full text-tiny text-default-500">{t("privacy")}</p>
      <div className="col-span-full">
        <FormErrorSummary message={formError} />
        <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("submit")}</SubmitButton>
      </div>
    </form>
  );
}
