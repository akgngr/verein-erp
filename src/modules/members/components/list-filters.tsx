"use client";

import { useTranslations } from "next-intl";

import { DateRangeFilter } from "@/shared/components/data-table/date-range-filter";

/**
 * Üye listesi tarih aralığı filtresi (katılım tarihi). Alt satırın solunda yer alır.
 */
export function MemberDateFilter() {
  const t = useTranslations("members.listFilters");
  return <DateRangeFilter label={t("joinDate")} idPrefix="member-date" />;
}

export const ListFilters = MemberDateFilter;
