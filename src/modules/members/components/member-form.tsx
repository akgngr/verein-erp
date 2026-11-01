"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";

import type { MembershipType } from "@prisma/client";

import { FormSurface, useFormDrawerClose } from "@/shared/components/forms/form-drawer";
import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { createMemberAction } from "../actions/create-member";
import { updateMemberAction } from "../actions/update-member";
import {
  MEMBERSHIP_TYPE_VALUES,
  MEMBER_STATUS_VALUES,
} from "../constants";
import { memberCreateSchema, memberUpdateSchema } from "../schemas/member";
import { berlinToday } from "../utils";

/** Form alanları string taşır; boş string sunucu şemasında null'a çevrilir. */
type MemberFormValues = {
  type: string;
  status: string;
  firstName: string;
  lastName: string;
  kimlikNo: string;
  email: string;
  phone: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  birthDate: string;
  profession: string;
  joinDate: string;
  exitDate: string;
  exitReason: string;
  notes: string;
  /** Yalnızca edit: eşzamanlılık koruması — ISO string. */
  updatedAt?: string;
};

export type MemberEditFormData = {
  id: string;
  membershipNumber: string;
  type: string;
  status: string;
  firstName: string;
  lastName: string;
  kimlikNo: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  birthDate: Date | null;
  profession: string | null;
  joinDate: Date;
  exitDate: Date | null;
  exitReason: string | null;
  notes: string | null;
  updatedAt: Date;
};

type MemberFormProps =
  | { mode: "create"; /** Faz 3 eklemeleri: pasif türler yeni kayıtta gizlenir. */ availableTypes?: MembershipType[] }
  | { mode: "edit"; member: MemberEditFormData };

const STATUS_SELECT_OPTIONS = MEMBER_STATUS_VALUES.map((status) => ({ value: status, label: status }));

/** Yeni/düzenleme üye formu. Üyelik numarası salt okunurdur; şemada yer almaz. */
export function MemberForm(props: MemberFormProps) {
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const t = useTranslations("members");
  const [formError, setFormError] = useState<string | null>(null);

  const isEdit = props.mode === "edit";
  const member = isEdit ? props.member : null;

  // Faz 3 eklemeleri: create modunda yalnız aktif türler listelenir; edit
  // modunda tüm türler seçilebilir kalır (mevcut üye pasif türde olabilir).
  const typeOptions =
    !isEdit && props.availableTypes
      ? MEMBERSHIP_TYPE_VALUES.filter((value) =>
          (props.availableTypes as MembershipType[]).includes(value),
        )
      : MEMBERSHIP_TYPE_VALUES;

  const defaultValues: MemberFormValues = member
    ? {
        updatedAt: new Date(member.updatedAt).toISOString(),
        type: member.type,
        status: member.status,
        firstName: member.firstName,
        lastName: member.lastName,
        kimlikNo: member.kimlikNo ?? "",
        email: member.email ?? "",
        phone: member.phone ?? "",
        street: member.street ?? "",
        houseNumber: member.houseNumber ?? "",
        postalCode: member.postalCode ?? "",
        city: member.city ?? "",
        state: member.state ?? "",
        country: member.country ?? "",
        birthDate:
          member.birthDate instanceof Date
            ? member.birthDate.toISOString().slice(0, 10)
            : member.birthDate
              ? String(member.birthDate)
              : "",
        profession: member.profession ?? "",
        joinDate: member.joinDate instanceof Date ? member.joinDate.toISOString().slice(0, 10) : String(member.joinDate),
        exitDate:
          member.exitDate instanceof Date
            ? member.exitDate.toISOString().slice(0, 10)
            : member.exitDate
              ? String(member.exitDate)
              : "",
        exitReason: member.exitReason ?? "",
        notes: member.notes ?? "",
      }
    : {
        type: "ASIL",
        status: "ACTIVE",
        firstName: "",
        lastName: "",
        kimlikNo: "",
        email: "",
        phone: "",
        street: "",
        houseNumber: "",
        postalCode: "",
        city: "",
        state: "",
        country: "",
        birthDate: "",
        profession: "",
        joinDate: berlinToday().toISOString().slice(0, 10),
        exitDate: "",
        exitReason: "",
        notes: "",
      };

  // KARAR: documents kalıbıyla aynı — z.preprocess'li şemayı resolver'a uyarla.
  const form = useForm<MemberFormValues>({
    resolver: isEdit
      ? (zodResolver(memberUpdateSchema) as unknown as Resolver<MemberFormValues>)
      : (zodResolver(memberCreateSchema) as unknown as Resolver<MemberFormValues>),
    defaultValues,
  });
  // Tarih seçicilerin sınırları (sunucu aynı kuralları ayrıca denetler; bkz. services/date-rules.ts).
  const watchedBirthDate = useWatch({ control: form.control, name: "birthDate" }) as string | null | undefined;
  const watchedJoinDate = useWatch({ control: form.control, name: "joinDate" }) as string | null | undefined;
  const todayIso = new Date().toISOString().slice(0, 10);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    if (isEdit && member) {
      const result = await updateMemberAction({ id: member.id, ...values });
      if (!result.ok) {
        setFormError(applyActionResult(result, form.setError));
        return;
      }
      addToast({ title: t("created.toastUpdated", { membershipNumber: result.data.membershipNumber }), color: "success" });
      // Çekmecede: kapat (adres değişince sunucu verisi tazelenir); sayfada: detaya dön.
      if (closeDrawer) {
        closeDrawer();
      } else {
        router.push(`/uyeler/${member.id}`);
        router.refresh();
      }
      return;
    }

    const result = await createMemberAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({ title: t("created.toast", { membershipNumber: result.data.membershipNumber }), color: "success" });
    router.push(`/uyeler/${result.data.id}`);
    router.refresh();
  });

  return (
    <FormSurface className="max-w-3xl">
        {isEdit && member ? (
          <div className="flex items-center gap-3 rounded-medium border border-default-200 bg-default-50 px-4 py-3">
            <span className="text-small font-semibold">{member.membershipNumber}</span>
            <span className="text-tiny text-default-500">
              {t("form.membershipReadOnly")}
            </span>
          </div>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              name="type"
              label={t("form.type")}
              control={form.control}
              options={typeOptions.map((value) => ({
                value,
                label: t(`type.${value}`),
              }))}
              isRequired
            />
            <FormSelect
              name="status"
              label={t("form.status")}
              control={form.control}
              options={STATUS_SELECT_OPTIONS.map((option) => ({
                value: option.value,
                label: t(`status.${option.value}`),
              }))}
              isRequired
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              name="firstName"
              label={t("form.firstName")}
              control={form.control}
              isRequired
              autoComplete="given-name"
            />
            <FormInput
              name="lastName"
              label={t("form.lastName")}
              control={form.control}
              isRequired
              autoComplete="family-name"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              name="kimlikNo"
              label={t("form.kimlikNo")}
              control={form.control}
              description={t("form.kimlikNoDescription")}
              placeholder={t("form.kimlikNoPlaceholder")}
            />
            <FormDatePicker
              name="birthDate"
              label={t("form.birthDate")}
              control={form.control}
              description={t("form.birthDateDescription")}
              minValue="1900-01-01"
              maxValue={todayIso}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              name="email"
              label={t("form.email")}
              control={form.control}
              type="email"
              autoComplete="email"
              placeholder={t("form.emailPlaceholder")}
            />
            <FormInput
              name="phone"
              label={t("form.phone")}
              control={form.control}
              type="tel"
              autoComplete="tel"
              placeholder={t("form.phonePlaceholder")}
            />
          </div>

          {/* KARAR (Verein pivotu): adres Alman adres yapısına göre yapılandırıldı. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormInput
              name="street"
              label={t("form.street")}
              control={form.control}
              placeholder={t("form.streetPlaceholder")}
              autoComplete="address-line1"
            />
            <FormInput
              name="houseNumber"
              label={t("form.houseNumber")}
              control={form.control}
              placeholder={t("form.houseNumberPlaceholder")}
              autoComplete="address-line2"
            />
            <FormInput
              name="postalCode"
              label={t("form.postalCode")}
              control={form.control}
              placeholder={t("form.postalCodePlaceholder")}
              autoComplete="postal-code"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              name="city"
              label={t("form.city")}
              control={form.control}
              placeholder={t("form.cityPlaceholder")}
              autoComplete="address-level2"
            />
            <FormInput
              name="state"
              label={t("form.state")}
              control={form.control}
              placeholder={t("form.statePlaceholder")}
              autoComplete="address-level1"
            />
          </div>
          <FormInput
            name="country"
            label={t("form.country")}
            control={form.control}
            description={t("form.countryDescription")}
            autoComplete="country-name"
          />

          <FormInput
            name="profession"
            label={t("form.profession")}
            control={form.control}
            placeholder={t("form.professionPlaceholder")}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormDatePicker
              name="joinDate"
              label={t("form.joinDate")}
              control={form.control}
              isRequired
              minValue={watchedBirthDate || "1900-01-01"}
            />
            <FormDatePicker
              name="exitDate"
              label={t("form.exitDate")}
              control={form.control}
              description={t("form.exitDateDescription")}
              minValue={watchedJoinDate || undefined}
            />
          </div>

          <FormTextarea
            name="exitReason"
            label={t("form.exitReason")}
            control={form.control}
            rows={2}
            description={t("form.exitReasonDescription")}
          />

          <FormTextarea
            name="notes"
            label={t("form.notes")}
            control={form.control}
            rows={3}
            description={t("form.notesDescription")}
          />

          <FormErrorSummary message={formError} />

          <div className="flex items-center gap-2">
            <SubmitButton isSubmitting={form.formState.isSubmitting}>
              {isEdit ? t("form.save") : t("form.submit")}
            </SubmitButton>
            <Button
              variant="light"
              onPress={() =>
                closeDrawer ? closeDrawer() : router.push(isEdit && member ? `/uyeler/${member.id}` : "/uyeler")
              }
            >
              {t("form.cancel")}
            </Button>
          </div>
        </form>
    </FormSurface>
  );
}
