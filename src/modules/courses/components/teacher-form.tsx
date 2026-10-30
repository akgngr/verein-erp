"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormSurface, useFormDrawerClose } from "@/shared/components/forms/form-drawer";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSwitch } from "@/shared/components/forms/form-switch";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { createTeacherAction, updateTeacherAction } from "../actions/teacher-actions";
import { teacherSchema, type TeacherInput } from "../schemas/teacher";
import type { TeacherRow } from "../types";
import { InviteResultNotice, type InviteResult } from "./invite-result";

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
    },
  });
  const wantsInvite = useWatch({ control: form.control, name: "invite" });

  const close = () => (closeDrawer ? closeDrawer() : router.push("/kurslar/ogretmenler"));

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    if (teacher) {
      const result = await updateTeacherAction({ id: teacher.id, ...values });
      if (!result.ok) return setFormError(applyActionResult(result, form.setError));
      addToast({ title: t("updated"), color: "success" });
      close();
      return;
    }
    const result = await createTeacherAction(values);
    if (!result.ok) return setFormError(applyActionResult(result, form.setError));
    addToast({ title: t("created"), color: "success" });
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
        <Button color="primary" className="mt-4" onPress={close}>
          {t("done")}
        </Button>
      </FormSurface>
    );
  }

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput name="firstName" label={t("firstName")} control={form.control} isRequired />
          <FormInput name="lastName" label={t("lastName")} control={form.control} isRequired />
          <FormInput name="email" label={t("email")} control={form.control} type="email" isRequired={wantsInvite} />
          <FormInput name="phone" label={t("phone")} control={form.control} type="tel" />
        </div>
        <FormInput name="subjects" label={t("subjects")} control={form.control} placeholder={t("subjectsPlaceholder")} />
        <FormTextarea name="note" label={t("note")} control={form.control} />
        <FormSwitch name="isActive" label={t("isActive")} control={form.control} />
        {!teacher ? (
          <div className="flex flex-col gap-1 rounded-medium border border-primary-200 bg-primary-50/40 p-3 dark:border-primary-500/30 dark:bg-primary-500/10">
            <FormSwitch name="invite" label={t("invite")} control={form.control} />
            <p className="text-tiny text-default-600">{t("inviteHelp")}</p>
          </div>
        ) : null}
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
