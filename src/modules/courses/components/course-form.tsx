"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast, Button, Checkbox } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormSurface, useFormDrawerClose } from "@/shared/components/forms/form-drawer";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { createCourseAction, updateCourseAction } from "../actions/course-actions";
import { COURSE_FEE_TYPE_VALUES, COURSE_KIND_VALUES, COURSE_STATUS_VALUES } from "../constants";
import { courseSchema, type CourseInput } from "../schemas/course";
import type { CourseDetail } from "../types";
import { centsToInput, formatDateOnly } from "../utils";

/** Kurs formu (sağ çekmece): genel bilgiler, zaman, ücret modeli ve öğretmenler. */
export function CourseForm({ course, teacherOptions }: { course?: CourseDetail; teacherOptions: { id: string; label: string }[] }) {
  const t = useTranslations("courses.form");
  const tEnum = useTranslations("courses.enums");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      kind: course?.kind ?? "COURSE",
      title: course?.title ?? "",
      subject: course?.subject ?? "",
      description: course?.description ?? "",
      level: course?.level ?? "",
      location: course?.location ?? "",
      scheduleNote: course?.scheduleNote ?? "",
      startDate: formatDateOnly(course?.startDate),
      endDate: formatDateOnly(course?.endDate),
      capacity: course?.capacity ? String(course.capacity) : "",
      feeType: course?.feeType ?? "FREE",
      fee: course && course.feeCents > 0 ? centsToInput(course.feeCents) : "",
      installmentCount: course?.installmentCount ? String(course.installmentCount) : "",
      status: course?.status ?? "PLANNED",
      teacherIds: course?.teacherIds ?? [],
    },
  });
  const feeType = useWatch({ control: form.control, name: "feeType" });

  const close = () => (closeDrawer ? closeDrawer() : router.push("/kurslar"));

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    if (course) {
      const result = await updateCourseAction({ id: course.id, ...values });
      if (!result.ok) return setFormError(applyActionResult(result, form.setError));
      addToast({ title: t("updated"), color: "success" });
      close();
      return;
    }
    const result = await createCourseAction(values);
    if (!result.ok) return setFormError(applyActionResult(result, form.setError));
    addToast({ title: t("created"), color: "success" });
    router.push(`/kurslar/${result.data.id}`);
  });

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect name="kind" label={t("kind")} control={form.control} options={COURSE_KIND_VALUES.map((value) => ({ value, label: tEnum(`kind.${value}`) }))} />
          <FormSelect name="status" label={t("status")} control={form.control} options={COURSE_STATUS_VALUES.map((value) => ({ value, label: tEnum(`status.${value}`) }))} />
        </div>
        <FormInput name="title" label={t("title")} control={form.control} isRequired />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput name="subject" label={t("subject")} control={form.control} />
          <FormInput name="level" label={t("level")} control={form.control} />
          <FormInput name="location" label={t("location")} control={form.control} />
          <FormInput name="scheduleNote" label={t("scheduleNote")} control={form.control} placeholder={t("scheduleNotePlaceholder")} />
          <FormDatePicker name="startDate" label={t("startDate")} control={form.control} isRequired />
          <FormDatePicker name="endDate" label={t("endDate")} control={form.control} />
          <FormInput name="capacity" label={t("capacity")} control={form.control} type="number" />
        </div>
        <section className="flex flex-col gap-3 rounded-medium border border-default-200 p-3">
          <p className="text-small font-medium">{t("feeTitle")}</p>
          <FormSelect name="feeType" label={t("feeType")} control={form.control} options={COURSE_FEE_TYPE_VALUES.map((value) => ({ value, label: tEnum(`feeType.${value}`) }))} />
          {feeType !== "FREE" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput name="fee" label={feeType === "MONTHLY" ? t("feeMonthly") : t("feeTotal")} control={form.control} isRequired description={t("feeHelp")} />
              {feeType === "INSTALLMENTS" ? <FormInput name="installmentCount" label={t("installmentCount")} control={form.control} type="number" isRequired /> : null}
            </div>
          ) : null}
          <p className="text-tiny text-default-500">{t(`feeExplain.${feeType}`)}</p>
        </section>
        <section className="flex flex-col gap-2">
          <p className="text-small font-medium">{t("teachers")}</p>
          {teacherOptions.length === 0 ? (
            <p className="text-tiny text-default-500">{t("noTeachers")}</p>
          ) : (
            <Controller
              control={form.control}
              name="teacherIds"
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {teacherOptions.map((option) => (
                    <Checkbox
                      key={option.id}
                      size="sm"
                      isSelected={field.value.includes(option.id)}
                      onValueChange={(checked) => field.onChange(checked ? [...field.value, option.id] : field.value.filter((id) => id !== option.id))}
                    >
                      {option.label}
                    </Checkbox>
                  ))}
                </div>
              )}
            />
          )}
        </section>
        <FormTextarea name="description" label={t("description")} control={form.control} />
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
