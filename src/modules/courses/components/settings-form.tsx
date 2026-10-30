"use client";

import { addToast, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { saveCoursesSettingsAction } from "../actions/fee-actions";

/** Kurs ücretlerinin yazılacağı muhasebe gelir kategorisi. */
export function CoursesSettingsForm({ initialCategoryId, categories }: { initialCategoryId: string; categories: { id: string; name: string; sphere: string }[] }) {
  const t = useTranslations("courses.settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex max-w-2xl flex-col gap-4 rounded-xl border border-default-200 bg-content1 p-5">
      <label className="flex flex-col gap-1 text-small">
        <span className="font-medium">{t("incomeCategory")}</span>
        <select
          className="h-10 rounded-medium border border-default-200 bg-default-50/50 px-3 text-small"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">{t("chooseCategory")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <span className="text-tiny text-default-500">{t("incomeCategoryHelp")}</span>
      </label>
      <Button
        color="primary"
        className="self-start"
        isLoading={busy}
        onPress={async () => {
          setBusy(true);
          const result = await saveCoursesSettingsAction({ incomeCategoryId: categoryId });
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
