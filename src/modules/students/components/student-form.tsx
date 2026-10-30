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
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormSwitch } from "@/shared/components/forms/form-switch";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { createStudentAction, updateStudentAction } from "../actions/student-actions";
import { STUDENT_STATUS_VALUES } from "../constants";
import { studentSchema, type StudentInput } from "../schemas/student";
import type { StudentDetail } from "../types";
import { formatDateOnly } from "../utils";

/** Öğrenci oluşturma/düzenleme formu (sağ çekmece). Veliler detay sayfasında bağlanır. */
export function StudentForm({ student }: { student?: StudentDetail }) {
  const t = useTranslations("students.form");
  const tStatus = useTranslations("students.status");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: student?.firstName ?? "",
      lastName: student?.lastName ?? "",
      birthDate: formatDateOnly(student?.birthDate),
      school: student?.school ?? "",
      gradeLevel: student?.gradeLevel ?? "",
      email: student?.email ?? "",
      phone: student?.phone ?? "",
      status: student?.status ?? "ACTIVE",
      photoConsent: student?.photoConsent ?? false,
      dataConsentAt: formatDateOnly(student?.dataConsentAt),
      note: student?.note ?? "",
    },
  });

  const close = () => (closeDrawer ? closeDrawer() : router.push("/ogrenciler"));

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = student ? await updateStudentAction({ id: student.id, ...values }) : await createStudentAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({ title: student ? t("updated") : t("created"), color: "success" });
    if (!student) {
      router.push(`/ogrenciler/${result.data.id}`);
      return;
    }
    close();
  });

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput name="firstName" label={t("firstName")} control={form.control} isRequired />
          <FormInput name="lastName" label={t("lastName")} control={form.control} isRequired />
          <FormDatePicker name="birthDate" label={t("birthDate")} control={form.control} />
          <FormSelect
            name="status"
            label={t("status")}
            control={form.control}
            options={STUDENT_STATUS_VALUES.map((value) => ({ value, label: tStatus(value) }))}
          />
          <FormInput name="school" label={t("school")} control={form.control} />
          <FormInput name="gradeLevel" label={t("gradeLevel")} control={form.control} />
          <FormInput name="email" label={t("email")} control={form.control} type="email" />
          <FormInput name="phone" label={t("phone")} control={form.control} type="tel" />
        </div>
        <div className="flex flex-col gap-3 rounded-medium border border-default-200 p-3">
          <p className="text-small font-medium">{t("consentTitle")}</p>
          <FormDatePicker name="dataConsentAt" label={t("dataConsentAt")} control={form.control} description={t("dataConsentHelp")} />
          <FormSwitch name="photoConsent" label={t("photoConsent")} control={form.control} />
        </div>
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
