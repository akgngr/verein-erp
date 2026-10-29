"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardBody, Switch, addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslations } from "next-intl";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { createDonationAction, updateDonationAction } from "../actions/donation-actions";
import { donationCreateSchema, donationUpdateSchema } from "../schemas/donation";
import { SMALL_DONATION_LIMIT_CENTS } from "../constants";

export type DonorOption = { id: string; label: string; donorNumber: number };

type DonationFormValues = {
  donorId: string;
  receivedAt: string;
  amount: string;
  method: string;
  reference: string;
  purposeNote: string;
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
  const t = useTranslations("donations.form");
  const tDetail = useTranslations("donations.detail");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<DonationFormValues>({
    resolver: (mode === "edit"
      ? zodResolver(donationUpdateSchema)
      : zodResolver(donationCreateSchema)) as unknown as Resolver<DonationFormValues>,
    defaultValues: {
      donorId: initial?.donorId ?? "",
      receivedAt: initial?.receivedAt ?? new Date().toISOString().slice(0, 10),
      amount: initial?.amount ?? "",
      method: initial?.method ?? "BANK_TRANSFER",
      reference: initial?.reference ?? "",
      purposeNote: initial?.purposeNote ?? "",
      waivedReimbursement: initial?.waivedReimbursement ?? false,
      claimBasis: initial?.claimBasis ?? "",
      waiverDeclaredAt: initial?.waiverDeclaredAt ?? "",
      expenseCategoryId: initial?.expenseCategoryId ?? "",
      id: initial?.id,
      updatedAt: initial?.updatedAt,
    },
  });

  const amount = form.watch("amount");
  const cents = Number((amount ?? "0").replace(",", ".").replace(/[^\d.]/g, "")) * 100 || 0;
  const showSmallHint = cents > 0 && cents <= SMALL_DONATION_LIMIT_CENTS;
  const waived = form.watch("waivedReimbursement");
  const method = form.watch("method");
  void method;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    if (mode === "edit" && values.id) {
      const result = await updateDonationAction({ ...values, updatedAt: values.updatedAt });
      if (!result.ok) {
        setFormError(applyActionResult(result, form.setError));
        return;
      }
      addToast({ title: t("toastSaved", { number: "" }), color: "success" });
      router.push(`/bagislar/${values.id}`);
      router.refresh();
      return;
    }
    const result = await createDonationAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({ title: t("toastSaved", { number: result.data.donationNumber }), color: "success" });
    router.push(`/bagislar/${result.data.id}`);
    router.refresh();
  });

  return (
    <Card shadow="sm" className="max-w-3xl">
      <CardBody className="gap-4 p-6">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormSelect
            name="donorId"
            label={t("donor")}
            control={form.control}
            isRequired
            isDisabled={mode === "edit"}
            options={donors.map((donor) => ({ value: donor.id, label: donor.label }))}
          />
          <FormDatePicker
            name="receivedAt"
            label={t("date")}
            control={form.control}
            isRequired
          />
          <div>
            <FormInput name="amount" label={t("amount")} control={form.control} isRequired placeholder="100,00" />
            {showSmallHint ? (
              <p className="mt-1 text-tiny text-default-400">{t("amountHint")}</p>
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
              { value: "OTHER", label: t("method.OTHER") },
              { value: "REIMBURSEMENT_WAIVER", label: t("method.REIMBURSEMENT_WAIVER") },
            ]}
          />
          <FormInput name="reference" label={t("reference")} control={form.control} />
          <FormTextarea name="purposeNote" label={t("purposeNote")} control={form.control} />

          {/* Aufwandsspende (§ 11 md. 4) */}
          <Controller
            name="waivedReimbursement"
            control={form.control}
            render={({ field }) => (
              <Switch isSelected={field.value} onValueChange={field.onChange} size="sm">
                <span className="text-small">{t("waived")}</span>
              </Switch>
            )}
          />
          {waived ? (
            <div className="flex flex-col gap-4 rounded-medium border border-warning-300 bg-warning-50 p-4 dark:border-warning-100 dark:bg-warning-100/10">
              <p className="text-tiny text-warning-700">{t("waivedNotice")}</p>
              <FormTextarea name="claimBasis" label={t("claimBasis")} control={form.control} />
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

          {formError ? (
            <p className="text-small text-danger" role="alert">
              {formError}
            </p>
          ) : null}
          <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("save")}</SubmitButton>
        </form>
      </CardBody>
      <span className="hidden">{tDetail("title")}</span>
    </Card>
  );
}
