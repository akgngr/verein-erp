"use client";
import { Select, ListBox, Label } from "@heroui/react";

import { useTranslations } from "next-intl";

import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";

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
    <Select
      id="members-dues-year"
      aria-label={t("year")}
      isRequired
      className="w-44"
      isDisabled={isPending}
      value={String(current)}
      onChange={(selectedValue) => {
        const keys = selectedValue === null ? undefined : String(selectedValue);
        const key = keys;
        if (key) setParams({ "filter.year": String(key) }, { resetPage: true });
      }}
    >
      <Label>{t("year")}</Label>
      <Select.Trigger className="h-9 text-sm">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {years.map((year) => (
            <ListBox.Item
              key={String(year)}
              id={String(year)}
              textValue={String(year)}
            >
              <Label>{year}</Label>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
