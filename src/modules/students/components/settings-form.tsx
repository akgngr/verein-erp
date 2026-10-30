"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormSurface } from "@/shared/components/forms/form-drawer";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { saveStudentsSettingsAction } from "../actions/settings-actions";
import { studentsSettingsSchema, type StudentsSettingsInput } from "../schemas/settings";

export function StudentsSettingsForm({ initial, canUpdate }: { initial: StudentsSettingsInput; canUpdate: boolean }) {
  const t = useTranslations("students.settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<StudentsSettingsInput>({
    resolver: zodResolver(studentsSettingsSchema) as unknown as Resolver<StudentsSettingsInput>,
    defaultValues: initial,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await saveStudentsSettingsAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({ title: t("saved"), color: "success" });
    router.refresh();
  });

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput name="datevConsultantNo" label={t("consultantNo")} control={form.control} isDisabled={!canUpdate} />
          <FormInput name="datevClientNo" label={t("clientNo")} control={form.control} isDisabled={!canUpdate} />
        </div>
        <FormInput
          name="debtorRangeStart"
          label={t("debtorRangeStart")}
          control={form.control}
          type="number"
          description={t("debtorRangeHelp")}
          isDisabled={!canUpdate}
        />
        <FormErrorSummary message={formError} />
        {canUpdate ? <SubmitButton isSubmitting={form.formState.isSubmitting}>{tCommon("save")}</SubmitButton> : null}
      </form>
    </FormSurface>
  );
}
