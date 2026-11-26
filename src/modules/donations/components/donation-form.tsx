"use client";

import { notify } from "@/shared/components/ui/notify";
import { Label, Switch } from "@/shared/components/kit";

import {
  FormSurface,
  useFormDrawerClose,
} from "@/shared/components/forms/form-drawer";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, type Resolver, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import {
  createDonationAction,
  updateDonationAction,
} from "../actions/donation-actions";
import {
  donationCreateSchema,
  donationUpdateSchema,
} from "../schemas/donation";
import { SMALL_DONATION_LIMIT_CENTS } from "../constants";

export type DonorOption = { id: string; label: string; donorNumber: number };

type DonationFormValues = {
  donorId: string;
  receivedAt: string;
  amount: string;
  method: string;
  reference: string;
  purposeNote: string;
  itemDescription: string;
  inKindOrigin: string;
  valuationRecordsAvailable: boolean;
  waivedReimbursement: boolean;
  claimBasis: string;
  waiverDeclaredAt: string;
  expenseCategoryId: string;
  id?: string;
  updatedAt?: string;
};

export function DonationForm({
  mode,
  donors,
  expenseCategories,
  initial,
}: {
  mode: "create" | "edit";
  donors: DonorOption[];
  expenseCategories: Array<{ id: string; name: string }>;
  initial?: Partial<DonationFormValues>;
}) {
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const t = useTranslations("donations.form");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<DonationFormValues>({
    resolver: (mode === "edit"
      ? zodResolver(donationUpdateSchema)
      : zodResolver(
          donationCreateSchema,
        )) as unknown as Resolver<DonationFormValues>,
    defaultValues: {
      donorId: initial?.donorId ?? "",
      receivedAt: initial?.receivedAt ?? new Date().toISOString().slice(0, 10),
      amount: initial?.amount ?? "",
      method: initial?.method ?? "BANK_TRANSFER",
      reference: initial?.reference ?? "",
      purposeNote: initial?.purposeNote ?? "",
      itemDescription: initial?.itemDescription ?? "",
      inKindOrigin: initial?.inKindOrigin ?? "",
      valuationRecordsAvailable: initial?.valuationRecordsAvailable ?? false,
      waivedReimbursement: initial?.waivedReimbursement ?? false,
      claimBasis: initial?.claimBasis ?? "",
      waiverDeclaredAt: initial?.waiverDeclaredAt ?? "",
      expenseCategoryId: initial?.expenseCategoryId ?? "",
      id: initial?.id,
      updatedAt: initial?.updatedAt,
    },
  });

  const amount = useWatch({ control: form.control, name: "amount" });
  const method = useWatch({ control: form.control, name: "method" });
  const isInKind = method === "IN_KIND";
  const cents =
    Number((amount ?? "0").replace(",", ".").replace(/[^\d.]/g, "")) * 100 || 0;
  const showSmallHint = !isInKind && cents > 0 && cents <= SMALL_DONATION_LIMIT_CENTS;
  const waived = useWatch({ control: form.control, name: "waivedReimbursement" });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const payload =
      values.method === "IN_KIND"
        ? { ...values, waivedReimbursement: false }
        : values;
    if (mode === "edit" && payload.id) {
      const result = await updateDonationAction({
        ...payload,
        updatedAt: payload.updatedAt,
      });
      if (!result.ok) {
        setFormError(applyActionResult(result, form.setError));
        return;
      }
      notify.success(t("toastSaved", { number: "" }));
      // Çekmecede: kapat (adres değişince sunucu verisi tazelenir); sayfada: detaya dön.
      if (closeDrawer) {
        closeDrawer();
      } else {
        router.push(`/bagislar/${payload.id}`);
        router.refresh();
      }
      return;
    }
    const result = await createDonationAction(payload);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    notify.success(t("toastSaved", { number: result.data.donationNumber }));
    router.push(`/bagislar/${result.data.id}`);
    router.refresh();
  });

  return (
    <FormSurface className="max-w-3xl">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormSelect
          name="donorId"
          label={t("donor")}
          control={form.control}
          isRequired
          isDisabled={mode === "edit"}
          options={donors.map((donor) => ({
            value: donor.id,
            label: donor.label,
          }))}
        />
        <FormDatePicker
          name="receivedAt"
          label={t("date")}
          control={form.control}
          isRequired
        />
        <div>
          <FormInput
            name="amount"
            label={isInKind ? t("inKindValue") : t("amount")}
            control={form.control}
            isRequired
            placeholder="100,00"
          />
          {showSmallHint ? (
            <p className="mt-1 text-xs text-ink-400">{t("amountHint")}</p>
          ) : null}
        </div>
        <FormSelect
          name="method"
          label={t("methodLabel")}
          control={form.control}
          isRequired
          options={[
            { value: "BANK_TRANSFER", label: t("method.BANK_TRANSFER") },
            { value: "CASH", label: t("method.CASH") },
            { value: "CARD", label: t("method.CARD") },
            { value: "PAYPAL", label: t("method.PAYPAL") },
            { value: "IN_KIND", label: t("method.IN_KIND") },
            { value: "OTHER", label: t("method.OTHER") },
            {
              value: "REIMBURSEMENT_WAIVER",
              label: t("method.REIMBURSEMENT_WAIVER"),
            },
          ]}
        />
        {isInKind ? (
          <div className="flex flex-col gap-4 rounded-lg border border-brand-300 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
            <p className="text-xs text-ink-600">{t("inKindNotice")}</p>
            <FormTextarea
              name="itemDescription"
              label={t("itemDescription")}
              control={form.control}
              isRequired
            />
            <FormSelect
              name="inKindOrigin"
              label={t("inKindOrigin")}
              control={form.control}
              isRequired
              options={[
                { value: "PRIVATE_ASSETS", label: t("origin.PRIVATE_ASSETS") },
                { value: "BUSINESS_ASSETS", label: t("origin.BUSINESS_ASSETS") },
                { value: "UNKNOWN", label: t("origin.UNKNOWN") },
              ]}
            />
            <Controller
              name="valuationRecordsAvailable"
              control={form.control}
              render={({ field }) => (
                <Switch
                  isSelected={field.value}
                  onChange={field.onChange}
                  size={"sm"}
                >
                  <Label>
                    <span className="text-sm">{t("valuationRecordsAvailable")}</span>
                  </Label>
                </Switch>
              )}
            />
          </div>
        ) : null}
        <FormInput
          name="reference"
          label={t("reference")}
          control={form.control}
        />
        <FormTextarea
          name="purposeNote"
          label={t("purposeNote")}
          control={form.control}
        />

        {/* Aufwandsspende (§ 11 md. 4) — ayni bağışta kapalıdır */}
        {!isInKind ? (
          <>
            <Controller
              name="waivedReimbursement"
              control={form.control}
              render={({ field }) => (
                <Switch
                  isSelected={field.value}
                  onChange={field.onChange}
                  size={"sm"}
                >
                  <Label>
                    <span className="text-sm">{t("waived")}</span>
                  </Label>
                </Switch>
              )}
            />
            {waived ? (
              <div className="flex flex-col gap-4 rounded-lg border border-warning-300 bg-warning-50 p-4 dark:border-warning-100 dark:bg-warning-100/10">
                <p className="text-xs text-warning-700">{t("waivedNotice")}</p>
                <FormTextarea
                  name="claimBasis"
                  label={t("claimBasis")}
                  control={form.control}
                />
                <FormDatePicker
                  name="waiverDeclaredAt"
                  label={t("waiverDeclaredAt")}
                  control={form.control}
                />
                <FormSelect
                  name="expenseCategoryId"
                  label={t("expenseCategory")}
                  control={form.control}
                  options={expenseCategories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {formError ? (
          <p className="text-sm text-danger" role="alert">
            {formError}
          </p>
        ) : null}
        <SubmitButton isSubmitting={form.formState.isSubmitting}>
          {t("save")}
        </SubmitButton>
      </form>
    </FormSurface>
  );
}
