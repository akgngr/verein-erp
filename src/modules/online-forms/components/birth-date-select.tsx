"use client";

import { Select, SelectItem } from "@heroui/react";
import { useLocale } from "next-intl";
import { useMemo } from "react";

/**
 * Doğum tarihi: gün / ay / yıl seçimi (takvimde yıllarca geri gitmek gerekmez). Değer "YYYY-MM-DD" ya da "".
 * Üçü de seçilene kadar değer boş kalır.
 */
export function BirthDateSelect({ id, label, value, onChange, isInvalid, errorMessage, labels }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  isInvalid?: boolean;
  errorMessage?: string;
  labels: { day: string; month: string; year: string };
}) {
  const locale = useLocale();
  const [y, m, d] = value ? value.split("-") : ["", "", ""];
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 110 }, (_, index) => String(current - index));
  }, []);
  const months = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
    return Array.from({ length: 12 }, (_, index) => ({ key: String(index + 1).padStart(2, "0"), label: format.format(new Date(Date.UTC(2000, index, 1))) }));
  }, [locale]);
  const days = Array.from({ length: y && m ? new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate() : 31 }, (_, index) => String(index + 1).padStart(2, "0"));

  const update = (next: { y?: string; m?: string; d?: string }) => {
    const year = next.y ?? y;
    const month = next.m ?? m;
    let day = next.d ?? d;
    if (year && month && day) {
      const max = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
      if (Number(day) > max) day = String(max).padStart(2, "0");
    }
    onChange(year || month || day ? `${year}-${month}-${day}` : "");
  };
  const pick = (keys: "all" | Set<React.Key>) => (keys === "all" ? "" : String(Array.from(keys)[0] ?? ""));

  return (
    <div className="flex flex-col gap-1">
      <span className="text-small text-foreground">{label}</span>
      <div className="grid grid-cols-[1fr_2fr_1.4fr] gap-2">
        <Select id={`${id}-day`} aria-label={`${label} – ${labels.day}`} placeholder={labels.day} selectedKeys={d ? [d] : []} onSelectionChange={(keys) => update({ d: pick(keys) })} isInvalid={isInvalid}>
          {days.map((item) => <SelectItem key={item}>{String(Number(item))}</SelectItem>)}
        </Select>
        <Select id={`${id}-month`} aria-label={`${label} – ${labels.month}`} placeholder={labels.month} selectedKeys={m ? [m] : []} onSelectionChange={(keys) => update({ m: pick(keys) })} isInvalid={isInvalid}>
          {months.map((item) => <SelectItem key={item.key}>{item.label}</SelectItem>)}
        </Select>
        <Select id={`${id}-year`} aria-label={`${label} – ${labels.year}`} placeholder={labels.year} selectedKeys={y ? [y] : []} onSelectionChange={(keys) => update({ y: pick(keys) })} isInvalid={isInvalid}>
          {years.map((item) => <SelectItem key={item}>{item}</SelectItem>)}
        </Select>
      </div>
      {isInvalid && errorMessage ? <p className="text-tiny text-danger">{errorMessage}</p> : null}
    </div>
  );
}
