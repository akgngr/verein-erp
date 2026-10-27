"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardBody, addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { Switch } from "@heroui/react";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { updateOrganizationProfileAction } from "../actions/update-profile";
import { organizationUpdateSchema } from "../schemas/profile";
import type { OrganizationProfileData } from "../queries/get-profile";
import { LogoUploader } from "./logo-uploader";

type ProfileFormValues = {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  registerCourt: string;
  registerNumber: string;
  taxNumber: string;
  taxOffice: string;
  exemptionNoticeDate: string;
  exemptionNoticePeriod: string;
  // Faz 5 (§ 4): Gemeinnützigkeit bölümü.
  exemptionDocumentType: string;
  charitablePurposes: string;
  membershipFeesDeductible: boolean;
  updatedAt: string;
};

/**
 * Dernek bilgileri formu (Faz 4, 4.2). Tüm alanlar istemcide tutulur; boş
 * string sunucu şemasında null'a çevrilir. updatedAt hidden alan eşzamanlılık
 * koruması sağlar (5. bölüm md. 6 kalıbı).
 */
export function ProfileForm({ profile }: { profile: OrganizationProfileData }) {
  const router = useRouter();
  const t = useTranslations("organization");
  const [formError, setFormError] = useState<string | null>(null);

  const defaultValues: ProfileFormValues = {
    name: profile.name,
    street: profile.street ?? "",
    postalCode: profile.postalCode ?? "",
    city: profile.city ?? "",
    country: profile.country ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    website: profile.website ?? "",
    registerCourt: profile.registerCourt ?? "",
    registerNumber: profile.registerNumber ?? "",
    taxNumber: profile.taxNumber ?? "",
    taxOffice: profile.taxOffice ?? "",
    exemptionNoticeDate: profile.exemptionNoticeDate
      ? profile.exemptionNoticeDate.toISOString().slice(0, 10)
      : "",
    exemptionNoticePeriod: profile.exemptionNoticePeriod ?? "",
    exemptionDocumentType: profile.exemptionDocumentType ?? "",
    charitablePurposes: profile.charitablePurposes ?? "",
    membershipFeesDeductible: profile.membershipFeesDeductible,
    updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : "",
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(organizationUpdateSchema) as unknown as import("react-hook-form").Resolver<ProfileFormValues>,
    defaultValues,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await updateOrganizationProfileAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({ title: t("savedToast"), color: "success" });
    router.refresh();
  });

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {/* Logo (kullanıcı isteği): form kaydından bağımsız, seçer seçilmez yüklenir. */}
      <LogoUploader logoVersion={profile.logoVersion} logoOriginalName={profile.logoOriginalName} />
      <Card shadow="sm">
        <CardBody className="gap-4 p-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <FormInput name="name" label={t("name")} control={form.control} isRequired description={t("nameDescription")} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput name="street" label={t("street")} control={form.control} />
            <FormInput name="postalCode" label={t("postalCode")} control={form.control} />
            <FormInput name="city" label={t("city")} control={form.control} />
            <FormInput name="country" label={t("country")} control={form.control} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput name="email" label={t("email")} control={form.control} type="email" />
            <FormInput name="phone" label={t("phone")} control={form.control} />
            <FormInput name="website" label={t("website")} control={form.control} placeholder="https://" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput name="registerCourt" label={t("registerCourt")} control={form.control} description={t("registerCourtDescription")} />
            <FormInput name="registerNumber" label={t("registerNumber")} control={form.control} placeholder="VR 12345" />
            <FormInput name="taxNumber" label={t("taxNumber")} control={form.control} />
            <FormInput name="taxOffice" label={t("taxOffice")} control={form.control} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormDatePicker
              name="exemptionNoticeDate"
              label={t("exemptionNoticeDate")}
              control={form.control}
              description={t("exemptionNoticeDateDescription")}
            />
            <FormInput name="exemptionNoticePeriod" label={t("exemptionNoticePeriod")} control={form.control} placeholder="2022–2024" />
          </div>

          {/* Faz 5 (§ 4): Gemeinnützigkeit (Kamu yararı) bölümü. */}
          <div className="mt-2 border-t border-default-200 pt-4">
            <h2 className="mb-3 text-small font-semibold uppercase tracking-wide text-default-500">
              {t("charitableSection")}
            </h2>
            <div className="flex flex-col gap-4">
              <FormSelect
                name="exemptionDocumentType"
                label={t("exemptionDocumentType")}
                control={form.control}
                description={t("exemptionDocumentTypeDescription")}
                options={[
                  { value: "", label: t("exemptionDocumentTypeNone") },
                  { value: "EXEMPTION_NOTICE", label: t("exemptionDocumentTypeNotice") },
                  { value: "TAX_ASSESSMENT_ANNEX", label: t("exemptionDocumentTypeAnnex") },
                  { value: "SPECIAL_ASSESSMENT_60A", label: t("exemptionDocumentType60a") },
                ]}
              />
              <FormTextarea
                name="charitablePurposes"
                label={t("charitablePurposes")}
                control={form.control}
                description={t("charitablePurposesDescription")}
              />
              {/* KARAR (§ 1): Bayrak uygulama kararı değil — § 10b Abs. 1 Satz 8
                  EStG kapsamı derneğe aittir; emin değilse Steuerberater'a sorulur. */}
              <Controller
                name="membershipFeesDeductible"
                control={form.control}
                render={({ field }) => (
                  <Switch isSelected={field.value} onValueChange={field.onChange} size="sm">
                    <span className="text-small">{t("membershipFeesDeductible")}</span>
                    <span className="block text-tiny text-default-400">
                      {t("membershipFeesDeductibleDescription")}
                    </span>
                  </Switch>
                )}
              />
            </div>
          </div>

          <FormErrorSummary message={formError} />
          <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("save")}</SubmitButton>
        </form>
      </CardBody>
      </Card>
    </div>
  );
}
