"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormSurface, useFormDrawerClose } from "@/shared/components/forms/form-drawer";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormSelect, type FormSelectOption } from "@/shared/components/forms/form-select";
import { SubmitButton } from "@/shared/components/forms/submit-button";
import { Button } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";

import {
  createYouthProtectionItemAction,
  updateYouthProtectionItemAction,
} from "../actions/item-actions";
import {
  youthProtectionItemSchema,
  type YouthProtectionItemInput,
} from "../schemas/item-schema";
import type { YouthProtectionRow } from "../types";

function toDateString(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

function addYears(dateStr: string, years: number): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  const nextY = y + years;
  return `${nextY}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * § 72a SGB VIII İbraz Kaydı Formu.
 * YASAL GİZLİLİK SINIRI: DSGVO Art. 10 gereği belge yüklemesi yapılamaz.
 * Orijinal belge fiziki olarak incelenir, asla dijitalleştirilmez.
 * Yalnızca ibraz olgusu, tarih ve durum (status) kaydedilir; serbest metin not girilmez.
 */
/** #585: Üye seçici (members public API'sinden; ad ve üye numarası). */
export type YouthProtectionMemberOption = { id: string; label: string; membershipNumber: string };

export function YouthProtectionItemForm({ item, memberOptions = [] }: { item?: YouthProtectionRow; memberOptions?: YouthProtectionMemberOption[] }) {
  const t = useTranslations("youth-protection.form");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const [formError, setFormError] = useState<string | null>(null);

  const todayStr = toDateString(new Date());
  const defaultDueDate = item?.nextDueDate
    ? toDateString(item.nextDueDate)
    : addYears(todayStr, 5);

  const form = useForm<YouthProtectionItemInput>({
    resolver: zodResolver(youthProtectionItemSchema),
    defaultValues: {
      personName: item?.personName ?? "",
      memberId: item?.memberId ?? "",
      userId: item?.userId ?? "",
      inspectionDate: item?.inspectionDate ? toDateString(item.inspectionDate) : todayStr,
      certificateIssueDate: item?.certificateIssueDate ? toDateString(item.certificateIssueDate) : todayStr,
      inspectingOfficer: item?.inspectingOfficer ?? "",
      nextDueDate: defaultDueDate,
      status: item?.status ?? "CLEARED",
      activityEndedAt: item?.activityEndedAt ? toDateString(item.activityEndedAt) : "",
    },
  });

  // Üye seçilince ad alanı boşsa üyenin adıyla doldurulur.
  const selectedMemberId = useWatch({ control: form.control, name: "memberId" });
  useEffect(() => {
    const member = memberOptions.find((option) => option.id === selectedMemberId);
    if (member && !form.getValues("personName")) form.setValue("personName", member.label, { shouldDirty: true });
  }, [selectedMemberId, memberOptions, form]);

  const statusOptions: FormSelectOption[] = [
    { value: "CLEARED", label: t("status_CLEARED") },
    { value: "EXCLUDED", label: t("status_EXCLUDED") },
    { value: "PENDING", label: t("status_PENDING") },
  ];

  const close = () => (closeDrawer ? closeDrawer() : router.push("/youth-protection"));

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = item
      ? await updateYouthProtectionItemAction({ id: item.id, ...values })
      : await createYouthProtectionItemAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    notify.success(item ? t("updated") : t("created"));
    close();
  });

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {/* Yasal uyarı bannerı */}
        <div className="flex items-start gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800 dark:border-warning-900/40 dark:bg-warning-950/30 dark:text-warning-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-600 dark:text-warning-400" />
          <p className="leading-snug">{t("legalNotice")}</p>
        </div>

        <FormInput
          name="personName"
          label={t("personName")}
          control={form.control}
          isRequired
          placeholder={t("personNamePlaceholder")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormDatePicker
            name="inspectionDate"
            label={t("inspectionDate")}
            control={form.control}
            isRequired
            description={t("inspectionDateHelp")}
          />
          <FormDatePicker
            name="certificateIssueDate"
            label={t("certificateIssueDate")}
            control={form.control}
            isRequired
            description={t("certificateIssueDateHelp")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            name="inspectingOfficer"
            label={t("inspectingOfficer")}
            control={form.control}
            isRequired
            placeholder={t("inspectingOfficerPlaceholder")}
          />
          <FormDatePicker
            name="nextDueDate"
            label={t("nextDueDate")}
            control={form.control}
            isRequired
            description={t("nextDueDateHelp")}
          />
        </div>

        {memberOptions.length > 0 ? (
          <FormSelect
            name="memberId"
            label={t("member")}
            control={form.control}
            options={[{ value: "", label: t("memberNone") }, ...memberOptions.map((member) => ({ value: member.id, label: `${member.label} (${member.membershipNumber})` }))]}
            description={t("memberHelp")}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect
            name="status"
            label={t("status")}
            control={form.control}
            options={statusOptions}
            isRequired
            description={t("statusHelp")}
          />
          <FormDatePicker
            name="activityEndedAt"
            label={t("activityEndedAt")}
            control={form.control}
            description={t("activityEndedAtHelp")}
          />
        </div>

        <FormErrorSummary message={formError} />

        <div className="flex items-center gap-2 pt-2">
          <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("save")}</SubmitButton>
          <Button variant="tertiary" onPress={close}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    </FormSurface>
  );
}
