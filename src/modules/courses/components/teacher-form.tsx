"use client";

import { notify } from "@/shared/components/ui/notify";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import {
  FormSurface,
  useFormDrawerClose,
} from "@/shared/components/forms/form-drawer";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormSwitch } from "@/shared/components/forms/form-switch";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import {
  createTeacherAction,
  updateTeacherAction,
} from "../actions/teacher-actions";
import { teacherSchema, type TeacherInput } from "../schemas/teacher";
import type { TeacherRow } from "../types";
import { InviteResultNotice, type InviteResult } from "./invite-result";
import { Button } from "@/shared/components/kit";

/** Öğretmen formu; yeni kayıtta isteğe bağlı olarak TEACHER rolüyle giriş hesabı açılır. */
export function TeacherForm({ teacher }: { teacher?: TeacherRow }) {
  const t = useTranslations("courses.teacherForm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const [formError, setFormError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const form = useForm<TeacherInput>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      firstName: teacher?.firstName ?? "",
      lastName: teacher?.lastName ?? "",
      email: teacher?.email ?? "",
      phone: teacher?.phone ?? "",
      subjects: teacher?.subjects ?? "",
      note: teacher?.note ?? "",
      isActive: teacher?.isActive ?? true,
      invite: false,
      compensation: teacher?.compensation ?? "NONE",
      rate: teacher?.rateCents
        ? (teacher.rateCents / 100).toFixed(2).replace(".", ",")
        : "",
      rateUnit: teacher?.rateUnit ?? "HOUR",
    },
  });
  const wantsInvite = useWatch({ control: form.control, name: "invite" });
  const compensation = useWatch({
    control: form.control,
    name: "compensation",
  });
  // Hesabı olan öğretmenin adı ve e-postası kullanıcı kaydından senkronlanır; burada düzenlenmez.
  const linked = Boolean(teacher?.userId);

  const close = () =>
    closeDrawer ? closeDrawer() : router.push("/kurslar/ogretmenler");

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    if (teacher) {
      const result = await updateTeacherAction({ id: teacher.id, ...values });
      if (!result.ok)
        return setFormError(applyActionResult(result, form.setError));
      notify.success(t("updated"));
      close();
      return;
    }
    const result = await createTeacherAction(values);
    if (!result.ok)
      return setFormError(applyActionResult(result, form.setError));
    notify.success(t("created"));
    if (result.data.invite) {
      setInvite({ ...result.data.invite, email: values.email });
      router.refresh();
      return;
    }
    close();
  });

  if (invite) {
    return (
      <FormSurface className="max-w-2xl">
        <InviteResultNotice result={invite} />
        <Button
          className="mt-4"
          onPress={close}
          variant={actionVariant("primary", "solid")}
        >
          {t("done")}
        </Button>
      </FormSurface>
    );
  }

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            name="firstName"
            label={t("firstName")}
            control={form.control}
            isDisabled={linked}
          />
          <FormInput
            name="lastName"
            label={t("lastName")}
            control={form.control}
            isRequired
            isDisabled={linked}
          />
          <FormInput
            name="email"
            label={t("email")}
            control={form.control}
            type="email"
            isRequired={wantsInvite}
            isDisabled={linked}
          />
          <FormInput
            name="phone"
            label={t("phone")}
            control={form.control}
            type="tel"
          />
        </div>
        {linked ? (
          <p className="-mt-2 text-xs text-ink-500">{t("linkedHint")}</p>
        ) : null}
        <FormInput
          name="subjects"
          label={t("subjects")}
          control={form.control}
          placeholder={t("subjectsPlaceholder")}
        />
        <FormTextarea name="note" label={t("note")} control={form.control} />
        <FormSwitch
          name="isActive"
          label={t("isActive")}
          control={form.control}
        />
        <div className="flex flex-col gap-3 rounded-lg border border-ink-200 p-3">
          <FormSelect
            name="compensation"
            label={t("compensation")}
            control={form.control}
            options={(
              ["NONE", "HONORAR", "UEBUNGSLEITER", "EHRENAMT"] as const
            ).map((value) => ({ value, label: t(`compensations.${value}`) }))}
          />
          {compensation !== "NONE" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                name="rate"
                label={t("rate")}
                control={form.control}
                isRequired
              />
              <FormSelect
                name="rateUnit"
                label={t("rateUnit")}
                control={form.control}
                options={(["HOUR", "SESSION"] as const).map((value) => ({
                  value,
                  label: t(`rateUnits.${value}`),
                }))}
              />
            </div>
          ) : null}
          <p className="text-xs text-ink-500">
            {teacher?.userId
              ? teacher.hasPaymentProfile
                ? t("paymentProfileOk")
                : t("paymentProfileMissing")
              : t("paymentProfileNoAccount")}
          </p>
        </div>
        {!teacher ? (
          <div className="flex flex-col gap-1 rounded-lg border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-500/30 dark:bg-brand-500/10">
            <FormSwitch
              name="invite"
              label={t("invite")}
              control={form.control}
            />
            <p className="text-xs text-ink-600">{t("inviteHelp")}</p>
          </div>
        ) : null}
        <FormErrorSummary message={formError} />
        <div className="flex items-center gap-2">
          <SubmitButton isSubmitting={form.formState.isSubmitting}>
            {tCommon("save")}
          </SubmitButton>
          <Button onPress={close} variant={actionVariant("default", "light")}>
            {tCommon("cancel")}
          </Button>
        </div>
      </form>
    </FormSurface>
  );
}
