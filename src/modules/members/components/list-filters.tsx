"use client";

import { DateRangeFilter } from "@/shared/components/data-table/date-range-filter";

/**
 * Üye listesi tarih aralığı filtresi (katılım tarihi). Alt satırın solunda yer alır.
 */
export function MemberDateFilter() {
  return <DateRangeFilter label="Katılım Tarihi" idPrefix="member-date" />;
}

export const ListFilters = MemberDateFilter;
