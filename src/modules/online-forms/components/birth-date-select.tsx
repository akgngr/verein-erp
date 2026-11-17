"use client";
import { useLocale } from "next-intl";
import { useMemo } from "react";

import { SelectField } from "@/shared/components/ui/select-field";

/**
 * Doğum tarihi: gün / ay / yıl seçimi (takvimde yıllarca geri gitmek gerekmez). Değer "YYYY-MM-DD" ya da "".
 * Üçü de seçilene kadar değer boş kalır.
 */
export function BirthDateSelect({
  id,
  label,
  value,
  onChange,
  isInvalid,
  errorMessage,
  labels,
}: {
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
    const format = new Intl.DateTimeFormat(locale, {
      month: "long",
      timeZone: "UTC",
    });
    return Array.from({ length: 12 }, (_, index) => ({
      key: String(index + 1).padStart(2, "0"),
      label: format.format(new Date(Date.UTC(2000, index, 1))),
    }));
  }, [locale]);
  const days = Array.from(
    {
      length:
        y && m ? new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate() : 31,
    },
    (_, index) => String(index + 1).padStart(2, "0"),
  );

  const update = (next: { y?: string; m?: string; d?: string }) => {
    const year = next.y ?? y;
    const month = next.m ?? m;
    let day = next.d ?? d;
    if (year && month && day) {
      const max = new Date(
        Date.UTC(Number(year), Number(month), 0),
      ).getUTCDate();
      if (Number(day) > max) day = String(max).padStart(2, "0");
    }
    onChange(year || month || day ? `${year}-${month}-${day}` : "");
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-foreground">{label}</span>
      <div className="grid grid-cols-[1fr_2fr_1.4fr] gap-2">
        <SelectField
          id={`${id}-day`}
          ariaLabel={`${label} – ${labels.day}`}
          placeholder={labels.day}
          isInvalid={isInvalid}
          value={d || null}
          options={days.map((item) => ({
            value: item,
            label: String(Number(item)),
          }))}
          onChange={(next) => update({ d: next ?? "" })}
        />
        <SelectField
          id={`${id}-month`}
          ariaLabel={`${label} – ${labels.month}`}
          placeholder={labels.month}
          isInvalid={isInvalid}
          value={m || null}
          options={months.map((item) => ({
            value: item.key,
            label: item.label,
          }))}
          onChange={(next) => update({ m: next ?? "" })}
        />
        <SelectField
          id={`${id}-year`}
          ariaLabel={`${label} – ${labels.year}`}
          placeholder={labels.year}
          isInvalid={isInvalid}
          value={y || null}
          options={years.map((item) => ({ value: item, label: item }))}
          onChange={(next) => update({ y: next ?? "" })}
        />
      </div>
      {isInvalid && errorMessage ? (
        <p className="text-xs text-danger">{errorMessage}</p>
      ) : null}
    </div>
  );
}
