"use client";

import { Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";

/**
 * Aidat raporu yıl seçici — filter.year URL parametresini günceller
 * (DataTable URL tabanlı durum kalıbı; liste ve Excel dışa aktarımı aynı
 * parametreyi paylaşır).
 */
export function DuesYearSelect({ current, years }: { current: number; years: number[] }) {
  const { setParams, isPending } = useListQueryState();
  const t = useTranslations("members.dues");

  return (
    <Select
      id="members-dues-year"
      aria-label={t("year")}
      label={t("year")}
      labelPlacement="outside-left"
      selectedKeys={[String(current)]}
      disallowEmptySelection
      size="sm"
      className="w-44"
      isDisabled={isPending}
      onSelectionChange={(keys) => {
        const key = [...keys][0];
        if (key) setParams({ "filter.year": String(key) }, { resetPage: true });
      }}
    >
      {years.map((year) => (
        <SelectItem key={String(year)} textValue={String(year)}>
          {year}
        </SelectItem>
      ))}
    </Select>
  );
}
