"use client";

import { notify } from "@/shared/components/ui/notify";
import { Spinner, Button } from "@/shared/components/kit";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { saveCoursesSettingsAction } from "../actions/fee-actions";
import type { CoursesSettingsData } from "../queries/course-parts";

type Category = { id: string; name: string; sphere: string };

const selectClass =
  "h-10 rounded-lg border border-ink-200 bg-ink-50/50 px-3 text-sm";
const inputClass =
  "h-10 rounded-lg border border-ink-200 bg-ink-50/50 px-3 text-sm";

/** Kurs ücretleri (gelir) ve öğretmen hakedişleri (gider) için muhasebe ayarları. */
export function CoursesSettingsForm({
  settings,
  categories,
  expenseCategories,
}: {
  settings: CoursesSettingsData;
  categories: Category[];
  expenseCategories: Category[];
}) {
  const t = useTranslations("courses.settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [incomeCategoryId, setIncomeCategoryId] = useState(
    settings.incomeCategoryId,
  );
  const [payoutCategoryId, setPayoutCategoryId] = useState(
    settings.payoutCategoryId,
  );
  const [minutes, setMinutes] = useState(
    String(settings.defaultSessionMinutes),
  );
  const [ulLimit, setUlLimit] = useState(
    String(settings.uebungsleiterLimitCents / 100),
  );
  const [ehLimit, setEhLimit] = useState(
    String(settings.ehrenamtLimitCents / 100),
  );
  const [busy, setBusy] = useState(false);

  const categorySelect = (
    label: string,
    help: string,
    value: string,
    onChange: (value: string) => void,
    options: Category[],
  ) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select
        className={selectClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{t("chooseCategory")}</option>
        {options.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <span className="text-xs text-ink-500">{help}</span>
    </label>
  );

  const numberField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    step = "1",
  ) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        min="0"
        step={step}
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );

  return (
    <div className="flex max-w-2xl flex-col gap-4 rounded-xl border border-ink-200 bg-surface p-5">
      {categorySelect(
        t("incomeCategory"),
        t("incomeCategoryHelp"),
        incomeCategoryId,
        setIncomeCategoryId,
        categories,
      )}
      <h3 className="mt-2 text-sm font-semibold">{t("payoutTitle")}</h3>
      {categorySelect(
        t("payoutCategory"),
        t("payoutCategoryHelp"),
        payoutCategoryId,
        setPayoutCategoryId,
        expenseCategories,
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {numberField(t("defaultSessionMinutes"), minutes, setMinutes)}
        {numberField(t("uebungsleiterLimit"), ulLimit, setUlLimit, "0.01")}
        {numberField(t("ehrenamtLimit"), ehLimit, setEhLimit, "0.01")}
      </div>
      <p className="text-xs text-ink-500">{t("limitsHelp")}</p>
      <Button
        className="self-start"
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
            notify.error(result.error);
            return;
          }
          notify.success(t("saved"));
          router.refresh();
        }}
        variant={actionVariant("primary", "solid")}
        isPending={busy}
      >
        {busy ? <Spinner size="sm" tone="current" /> : null}
        {tCommon("save")}
      </Button>
    </div>
  );
}
