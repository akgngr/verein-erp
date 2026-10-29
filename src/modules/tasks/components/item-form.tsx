"use client";

import { addToast, Button } from "@heroui/react";
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

import { createTaskAction, updateTaskAction } from "../actions/item-actions";
import { taskSchema } from "../schemas/item-schema";
import type { MeetingOption, MemberOption, TaskPriority, TasksRow, TaskStatus } from "../types";

export type TaskFormValues = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  memberId: string;
  meetingId: string;
};

/** Oluşturma/düzenleme formu; sağ çekmecede açılır (views/item-*-view.tsx). */
export function TasksItemForm({
  item,
  memberOptions = [],
  meetingOptions = [],
}: {
  item?: TasksRow;
  memberOptions?: MemberOption[];
  meetingOptions?: MeetingOption[];
}) {
  const t = useTranslations("tasks.form");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema) as unknown as Resolver<TaskFormValues>,
    defaultValues: {
      title: item?.title ?? "",
      description: item?.description ?? "",
      status: item?.status ?? "OPEN",
      priority: item?.priority ?? "NORMAL",
      dueDate: item?.dueDate ?? "",
      memberId: item?.memberId ?? "",
      meetingId: item?.meetingId ?? "",
    },
  });

  const close = () => (closeDrawer ? closeDrawer() : router.push("/tasks"));

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = item
      ? await updateTaskAction({ id: item.id, ...values })
      : await createTaskAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({ title: item ? t("updated") : t("created"), color: "success" });
    close();
  });

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <FormInput name="title" label={t("title")} control={form.control} isRequired />
        <FormTextarea name="description" label={t("description")} control={form.control} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect
            name="status"
            label={t("status")}
            control={form.control}
            options={[
              { value: "OPEN", label: t("statuses.OPEN") },
              { value: "IN_PROGRESS", label: t("statuses.IN_PROGRESS") },
              { value: "DONE", label: t("statuses.DONE") },
              { value: "CANCELLED", label: t("statuses.CANCELLED") },
            ]}
            isRequired
          />
          <FormSelect
            name="priority"
            label={t("priority")}
            control={form.control}
            options={[
              { value: "LOW", label: t("priorities.LOW") },
              { value: "NORMAL", label: t("priorities.NORMAL") },
              { value: "HIGH", label: t("priorities.HIGH") },
            ]}
            isRequired
          />
        </div>

        <FormDatePicker name="dueDate" label={t("dueDate")} control={form.control} />

        <FormSelect
          name="memberId"
          label={t("assignee")}
          control={form.control}
          options={memberOptions.map((m) => ({ value: m.id, label: m.label }))}
          placeholder={t("selectMemberPlaceholder")}
        />

        <FormSelect
          name="meetingId"
          label={t("meeting")}
          control={form.control}
          options={meetingOptions.map((m) => ({ value: m.id, label: m.label }))}
          placeholder={t("selectMeetingPlaceholder")}
        />

        <FormErrorSummary message={formError} />
        <div className="flex items-center gap-2 pt-2">
          <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("save")}</SubmitButton>
          <Button variant="light" onPress={close}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    </FormSurface>
  );
}
