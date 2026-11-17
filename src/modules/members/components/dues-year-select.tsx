"use client";

import { useTranslations } from "next-intl";

import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";
import { SelectField } from "@/shared/components/ui/select-field";

/**
 * Aidat raporu yıl seçici — filter.year URL parametresini günceller
 * (DataTable URL tabanlı durum kalıbı; liste ve Excel dışa aktarımı aynı
 * parametreyi paylaşır).
 */
export function DuesYearSelect({
  current,
  years,
}: {
  current: number;
  years: number[];
}) {
  const { setParams, isPending } = useListQueryState();
  const t = useTranslations("members.dues");

  return (
    <SelectField
      id="members-dues-year"
      ariaLabel={t("year")}
      label={t("year")}
      isRequired
      className="w-44"
      triggerClassName="h-9 text-sm"
      isDisabled={isPending}
      value={String(current)}
      options={years.map((year) => ({
        value: String(year),
        label: String(year),
      }))}
      onChange={(value) => {
        if (value) setParams({ "filter.year": value }, { resetPage: true });
      }}
    />
  );
}
