"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormSurface, useFormDrawerClose } from "@/shared/components/forms/form-drawer";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";
import { Button } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";
import { centsToDecimalString } from "@/shared/money";

import { createSponsorAction, updateSponsorAction } from "../actions/sponsor-actions";
import { SPONSOR_STATUSES, SPONSOR_TIERS } from "../constants";
import { sponsorFormSchema, type SponsorFormInput } from "../schemas/sponsor-schema";
import type { SponsorRow } from "../types";

function toIsoDate(value: Date | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

/** Sponsor oluşturma/düzenleme formu; sağ çekmecede açılır. */
export function SponsorForm({ sponsor }: { sponsor?: SponsorRow }) {
  const t = useTranslations("sponsors.form");
  const tTier = useTranslations("sponsors.tier");
  const tStatus = useTranslations("sponsors.status");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SponsorFormInput>({
    resolver: zodResolver(sponsorFormSchema) as unknown as Resolver<SponsorFormInput>,
    defaultValues: {
      name: sponsor?.name ?? "",
      tier: sponsor?.tier ?? "SUPPORTER",
      status: sponsor?.status ?? "ACTIVE",
      amount: sponsor && sponsor.amountCents > 0 ? centsToDecimalString(sponsor.amountCents) : "",
      contactName: sponsor?.contactName ?? "",
      contactEmail: sponsor?.contactEmail ?? "",
      contactPhone: sponsor?.contactPhone ?? "",
      website: sponsor?.website ?? "",
      startDate: toIsoDate(sponsor?.startDate),
      endDate: toIsoDate(sponsor?.endDate),
      notes: sponsor?.notes ?? "",
    },
  });

  const tierOptions = SPONSOR_TIERS.map((tier) => ({ value: tier, label: tTier(tier) }));
  const statusOptions = SPONSOR_STATUSES.map((status) => ({ value: status, label: tStatus(status) }));

  const close = () => (closeDrawer ? closeDrawer() : router.push("/sponsors"));

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = sponsor
      ? await updateSponsorAction({ id: sponsor.id, ...values })
      : await createSponsorAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    notify.success(sponsor ? t("updated") : t("created"));
    close();
  });

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <FormInput name="name" label={t("name")} control={form.control} isRequired />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect name="tier" label={t("tier")} control={form.control} options={tierOptions} isRequired />
          <FormSelect name="status" label={t("status")} control={form.control} options={statusOptions} isRequired />
        </div>
        <FormInput
          name="amount"
          label={t("amount")}
          placeholder={t("amountPlaceholder")}
          control={form.control}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormDatePicker name="startDate" label={t("startDate")} control={form.control} />
          <FormDatePicker name="endDate" label={t("endDate")} control={form.control} />
        </div>
        <FormInput name="contactName" label={t("contactName")} control={form.control} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput name="contactEmail" label={t("contactEmail")} type="email" control={form.control} />
          <FormInput name="contactPhone" label={t("contactPhone")} control={form.control} />
        </div>
        <FormInput
          name="website"
          label={t("website")}
          placeholder={t("websitePlaceholder")}
          type="url"
          control={form.control}
        />
        <FormTextarea name="notes" label={t("notes")} control={form.control} />
        <FormErrorSummary message={formError} />
        <div className="flex items-center gap-2">
          <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("save")}</SubmitButton>
          <Button variant="tertiary" onPress={close}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    </FormSurface>
  );
}
