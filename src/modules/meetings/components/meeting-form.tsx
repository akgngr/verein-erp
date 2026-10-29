"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardBody, addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch, type Control, type Resolver } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { createMeetingAction, updateMeetingAction } from "../actions/meeting-actions";
import { MEETING_TYPE_LABELS } from "../constants";
import type { MeetingType } from "@prisma/client";
import { meetingCreateSchema, meetingUpdateSchema } from "../schemas/meeting";
import type { CopySourceOption } from "../types";
import { berlinToday } from "../utils";

type MeetingTypeKey = "BOARD" | "GENERAL_ASSEMBLY" | "COMMITTEE" | "OTHER";

/** Form alanları string taşır; boş string sunucu şemasında null'a çevrilir. */
type MeetingFormValues = {
  type?: MeetingTypeKey;
  title: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string;
  quorumRequired: string;
  description: string;
  copyFromMeetingId?: string;
  /** Yalnızca edit: eşzamanlılık koruması (5. bölüm md. 6) — ISO string. */
  updatedAt?: string;
};

export type MeetingEditFormData = {
  id: string;
  type: MeetingTypeKey;
  meetingNumber: string;
  title: string;
  meetingDate: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  quorumRequired: number | null;
  description: string | null;
  updatedAt: Date;
};

type MeetingFormProps =
  | {
      mode: "create";
      /** KARAR: kaynak listesi tür bazında sunucudan önden alınır (list-copy-sources). */
      copySourcesByType: Partial<Record<MeetingTypeKey, CopySourceOption[]>>;
    }
  | { mode: "edit"; meeting: MeetingEditFormData };

const MEETING_TYPES = Object.keys(MEETING_TYPE_LABELS) as MeetingType[];

/**
 * Toplantı oluşturma/düzenleme formu (7.2). Create'te "Önceki toplantıdan
 * kopyala" seçici tür seçilince ve kaynak varken görünür; numara sunucuda
 * üretilir, formda taşınmaz.
 */
export function MeetingForm(props: MeetingFormProps) {
  const router = useRouter();
  const t = useTranslations("meetings.form");
  const tType = useTranslations("meetings.type");
  const tCommon = useTranslations("common");
  const [formError, setFormError] = useState<string | null>(null);
  const typeOptions = [
    { value: "", label: t("selectType") },
    ...MEETING_TYPES.map((type) => ({ value: type, label: tType(type) })),
  ];

  const isEdit = props.mode === "edit";
  const meeting = isEdit ? props.meeting : null;

  const defaultValues: MeetingFormValues = meeting
    ? {
        updatedAt: new Date(meeting.updatedAt).toISOString(),
        type: meeting.type,
        title: meeting.title,
        meetingDate: meeting.meetingDate.toISOString().slice(0, 10),
        startTime: meeting.startTime ?? "",
        endTime: meeting.endTime ?? "",
        location: meeting.location ?? "",
        quorumRequired:
          meeting.quorumRequired !== null ? String(meeting.quorumRequired) : "",
        description: meeting.description ?? "",
      }
    : {
        type: undefined,
        title: "",
        meetingDate: berlinToday().toISOString().slice(0, 10),
        startTime: "",
        endTime: "",
        location: "",
        quorumRequired: "",
        description: "",
        copyFromMeetingId: "",
      };

  const form = useForm<MeetingFormValues>({
    resolver: isEdit
      ? (zodResolver(meetingUpdateSchema) as unknown as Resolver<MeetingFormValues>)
      : (zodResolver(meetingCreateSchema) as unknown as Resolver<MeetingFormValues>),
    defaultValues,
  });

  // KARAR: tür değişince kopyalama seçimi sıfırlanır (yanlış türden kopya engellenir).
  const watchedType = useWatch({ control: form.control, name: "type" });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    if (meeting) {
      const result = await updateMeetingAction({ id: meeting.id, ...values });
      if (!result.ok) {
        setFormError(applyActionResult(result, form.setError));
        return;
      }
      addToast({ title: t("updatedToast"), color: "success" });
      router.push(`/toplantilar/${meeting.id}?sekme=gundem`);
      router.refresh();
      return;
    }

    const result = await createMeetingAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({ title: t("createdToast", { number: result.data.meetingNumber }), color: "success" });
    router.push(`/toplantilar/${result.data.id}?sekme=gundem`);
    router.refresh();
  });

  const copySources =
    !isEdit && watchedType
      ? (props.copySourcesByType[watchedType as MeetingTypeKey] ?? [])
      : [];

  return (
    <Card shadow="sm" className="max-w-3xl">
      <CardBody className="gap-4 p-6">
        {meeting ? (
          <div className="flex items-center gap-3 rounded-medium border border-default-200 bg-default-50 px-4 py-3">
            <span className="text-small font-semibold">{meeting.meetingNumber}</span>
            <span className="text-tiny text-default-500">{t("immutableNote")}</span>
          </div>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {!isEdit ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormSelect
                name="type"
                label={t("type")}
                control={form.control}
                options={typeOptions}
                isRequired
                key={watchedType === undefined ? "type-empty" : "type-set"}
              />
              {copySources.length > 0 ? (
                <CopySourceSelect
                  control={form.control}
                  copySources={copySources}
                  resetKey={watchedType ?? ""}
                />
              ) : null}
            </div>
          ) : null}

          <FormInput name="title" label={t("title")} control={form.control} isRequired />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormDatePicker
              name="meetingDate"
              label={t("date")}
              control={form.control}
              isRequired
            />
            <FormInput
              name="startTime"
              label={t("startTime")}
              control={form.control}
              placeholder={t("timePlaceholder")}
              description={t("startTimeDescription")}
            />
            <FormInput
              name="endTime"
              label={t("endTime")}
              control={form.control}
              placeholder={t("timePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput name="location" label={t("location")} control={form.control} />
            <FormInput
              name="quorumRequired"
              label={t("quorum")}
              control={form.control}
              type="number"
              description={t("quorumDescription")}
            />
          </div>

          <FormTextarea
            name="description"
            label={t("description")}
            control={form.control}
            rows={3}
            description={t("descriptionDescription")}
          />

          <FormErrorSummary message={formError} />

          <div className="flex items-center gap-2">
            <SubmitButton isSubmitting={form.formState.isSubmitting}>
              {isEdit ? t("saveChanges") : t("create")}
            </SubmitButton>
            <Button
              variant="light"
              onPress={() =>
                router.push(meeting ? `/toplantilar/${meeting.id}` : "/toplantilar")
              }
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/** Kopyalama seçici: tür değişiminde sıfırlanır (resetKey ile yeniden bağlanır). */
function CopySourceSelect({
  control,
  copySources,
  resetKey,
}: {
  control: Control<MeetingFormValues>;
  copySources: CopySourceOption[];
  resetKey: string;
}) {
  const t = useTranslations("meetings.form");
  return (
    <FormSelect
      key={`copy-${resetKey}`}
      name="copyFromMeetingId"
      label={t("copyFrom")}
      control={control}
      options={[
        { value: "", label: t("copyNone") },
        ...copySources.map((source) => ({
          value: source.id,
          label: `${source.meetingNumber} – ${source.title} – ${source.meetingDate
            .toISOString()
            .slice(0, 10)}`,
        })),
      ]}
      description={t("copyFromDescription")}
    />
  );
}
