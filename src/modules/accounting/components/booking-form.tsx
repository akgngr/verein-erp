"use client";

import { FormSurface, useFormDrawerClose } from "@/shared/components/forms/form-drawer";
import { zodResolver } from "@hookform/resolvers/zod";
import { addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useTranslations } from "next-intl";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import type { AccountOption, CategoryOption, ProjectOption } from "../types";
import {
  bookingCreateSchema,
  bookingUpdateSchema,
} from "../schemas/booking";
import { createBookingAction, updateBookingAction } from "../actions/booking-actions";

/** Form değerleri string taşır; boş string sunucuda null'a çevrilir. */
export type BookingFormValues = {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  bookingDate: string;
  accountId: string;
  counterAccountId: string;
  categoryId: string;
  projectId: string;
  amount: string;
  description: string;
  counterparty: string;
  receiptReference: string;
  /** Yalnızca edit: eşzamanlılık + id. */
  id?: string;
  updatedAt?: string;
};

export type BookingEditData = BookingFormValues;

type Props = {
  mode: "create" | "edit";
  accounts: AccountOption[];
  categories: CategoryOption[];
  projects: ProjectOption[];
  initial?: Partial<BookingEditData> & Pick<BookingEditData, "type">;
};

/**
 * Fiş formu (§ 11.2): tür?tur=gelir|gider|virman'a göre alan seti uyarlanır —
 * virmanda kaynak/hedef hesap + kategori/proje yok; gelir/giderde kategori
 * yöne göre filtrelenir, seçenek etiketi alanı (sphere) gösterir.
 */
export function BookingForm({ mode, accounts, categories, projects, initial }: Props) {
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const t = useTranslations("accounting.form");
  const tSpheres = useTranslations("accounting.budget");
  const [formError, setFormError] = useState<string | null>(null);

  const type = initial?.type ?? "INCOME";
  const isTransfer = type === "TRANSFER";

  const directionFilter = type === "INCOME" ? "INCOME" : "EXPENSE";
  const categoryOptions = isTransfer
    ? []
    : categories.filter((category) => category.direction === directionFilter);

  const defaultValues: BookingFormValues = {
    type,
    bookingDate: initial?.bookingDate ?? new Date().toISOString().slice(0, 10),
    accountId: initial?.accountId ?? "",
    counterAccountId: initial?.counterAccountId ?? "",
    categoryId: initial?.categoryId ?? "",
    projectId: initial?.projectId ?? "",
    amount: initial?.amount ?? "",
    description: initial?.description ?? "",
    counterparty: initial?.counterparty ?? "",
    receiptReference: initial?.receiptReference ?? "",
    id: initial?.id,
    updatedAt: initial?.updatedAt,
  };

  const form = useForm<BookingFormValues>({
    // KARAR: create şeması discriminated union; resolver tipi uyarlanır (document-form kalıbı).
    resolver: (mode === "edit"
      ? zodResolver(bookingUpdateSchema)
      : zodResolver(bookingCreateSchema)) as unknown as Resolver<BookingFormValues>,
    defaultValues,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    if (mode === "edit" && values.id) {
      const result = await updateBookingAction({
        id: values.id,
        bookingDate: values.bookingDate,
        accountId: values.accountId,
        counterAccountId: isTransfer ? values.counterAccountId : null,
        categoryId: isTransfer ? null : values.categoryId,
        projectId: values.projectId || null,
        amount: values.amount,
        description: values.description,
        counterparty: values.counterparty || null,
        receiptReference: values.receiptReference || null,
        updatedAt: values.updatedAt,
      });
      if (!result.ok) {
        setFormError(applyActionResult(result, form.setError));
        return;
      }
      addToast({ title: t("toastUpdated"), color: "success" });
      // Çekmecede: kapat (adres değişince sunucu verisi tazelenir); sayfada: detaya dön.
      if (closeDrawer) {
        closeDrawer();
      } else {
        router.push(`/muhasebe/${values.id}`);
        router.refresh();
      }
      return;
    }

    const result = await createBookingAction({
      type,
      bookingDate: values.bookingDate,
      accountId: values.accountId,
      counterAccountId: isTransfer ? values.counterAccountId : undefined,
      categoryId: isTransfer ? undefined : values.categoryId,
      projectId: values.projectId || null,
      amount: values.amount,
      description: values.description,
      counterparty: values.counterparty || null,
      receiptReference: values.receiptReference || null,
    });
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({ title: t("toastSaved", { number: result.data.bookingNumber }), color: "success" });
    router.push(`/muhasebe/${result.data.id}`);
    router.refresh();
  });

  return (
    <FormSurface className="max-w-3xl">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormDatePicker
            name="bookingDate"
            label={t("date")}
            control={form.control}
            isRequired
          />
          <FormInput
            name="amount"
            label={t("amount")}
            control={form.control}
            isRequired
            placeholder="120,00"
          />
          <FormSelect
            name="accountId"
            label={isTransfer ? t("sourceAccount") : t("account")}
            control={form.control}
            isRequired
            options={accounts.map((account) => ({ value: account.id, label: account.name }))}
          />
          {isTransfer ? (
            <FormSelect
              name="counterAccountId"
              label={t("targetAccount")}
              control={form.control}
              isRequired
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            />
          ) : (
            <FormSelect
              name="categoryId"
              label={t("category")}
              control={form.control}
              isRequired
              options={categoryOptions.map((category) => ({
                value: category.id,
                label: `${category.name} — ${tSpheres(`sphere${category.sphere.charAt(0)}${category.sphere.slice(1).toLowerCase()}`)}`,
              }))}
            />
          )}
          <FormSelect
            name="projectId"
            label={t("project")}
            control={form.control}
            options={[
              { value: "", label: "—" },
              ...projects.map((project) => ({ value: project.id, label: project.name })),
            ]}
          />
          <FormTextarea
            name="description"
            label={t("description")}
            control={form.control}
            isRequired
          />
          <FormInput name="counterparty" label={t("counterparty")} control={form.control} />
          <FormInput
            name="receiptReference"
            label={t("receiptReference")}
            control={form.control}
          />

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
