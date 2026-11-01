"use client";

import { addToast, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { saveCoursesSettingsAction } from "../actions/fee-actions";
import type { CoursesSettingsData } from "../queries/course-parts";

type Category = { id: string; name: string; sphere: string };

const selectClass = "h-10 rounded-medium border border-default-200 bg-default-50/50 px-3 text-small";
const inputClass = "h-10 rounded-medium border border-default-200 bg-default-50/50 px-3 text-small";

/** Kurs ücretleri (gelir) ve öğretmen hakedişleri (gider) için muhasebe ayarları. */
export function CoursesSettingsForm({ settings, categories, expenseCategories }: { settings: CoursesSettingsData; categories: Category[]; expenseCategories: Category[] }) {
  const t = useTranslations("courses.settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [incomeCategoryId, setIncomeCategoryId] = useState(settings.incomeCategoryId);
  const [payoutCategoryId, setPayoutCategoryId] = useState(settings.payoutCategoryId);
  const [minutes, setMinutes] = useState(String(settings.defaultSessionMinutes));
  const [ulLimit, setUlLimit] = useState(String(settings.uebungsleiterLimitCents / 100));
  const [ehLimit, setEhLimit] = useState(String(settings.ehrenamtLimitCents / 100));
  const [busy, setBusy] = useState(false);

  const categorySelect = (label: string, help: string, value: string, onChange: (value: string) => void, options: Category[]) => (
    <label className="flex flex-col gap-1 text-small">
      <span className="font-medium">{label}</span>
      <select className={selectClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t("chooseCategory")}</option>
        {options.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <span className="text-tiny text-default-500">{help}</span>
    </label>
  );

  const numberField = (label: string, value: string, onChange: (value: string) => void, step = "1") => (
    <label className="flex flex-col gap-1 text-small">
      <span className="font-medium">{label}</span>
      <input type="number" min="0" step={step} className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );

  return (
    <div className="flex max-w-2xl flex-col gap-4 rounded-xl border border-default-200 bg-content1 p-5">
      {categorySelect(t("incomeCategory"), t("incomeCategoryHelp"), incomeCategoryId, setIncomeCategoryId, categories)}
      <h3 className="mt-2 text-small font-semibold">{t("payoutTitle")}</h3>
      {categorySelect(t("payoutCategory"), t("payoutCategoryHelp"), payoutCategoryId, setPayoutCategoryId, expenseCategories)}
      <div className="grid gap-4 sm:grid-cols-3">
        {numberField(t("defaultSessionMinutes"), minutes, setMinutes)}
        {numberField(t("uebungsleiterLimit"), ulLimit, setUlLimit, "0.01")}
        {numberField(t("ehrenamtLimit"), ehLimit, setEhLimit, "0.01")}
      </div>
      <p className="text-tiny text-default-500">{t("limitsHelp")}</p>
      <Button
        color="primary"
        className="self-start"
        isLoading={busy}
        onPress={async () => {
          setBusy(true);
          const result = await saveCoursesSettingsAction({
            incomeCategoryId,
            payoutCategoryId,
            defaultSessionMinutes: Number(minutes),
            uebungsleiterLimitCents: Math.round(Number(ulLimit) * 100),
            ehrenamtLimitCents: Math.round(Number(ehLimit) * 100),
          });
          setBusy(false);
          if (!result.ok) {
            addToast({ title: result.error, color: "danger" });
            return;
          }
          addToast({ title: t("saved"), color: "success" });
          router.refresh();
        }}
      >
        {tCommon("save")}
      </Button>
    </div>
  );
}
