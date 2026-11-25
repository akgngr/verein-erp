"use client";

/**
 * UI kit — date input (W3). Works with ISO date strings ("YYYY-MM-DD"; "" = empty) so modules never handle
 * framework date objects.
 */
import { parseDate } from "@internationalized/date";
import { DateField, DatePicker, Description, Label } from "@heroui/react";
import type { ReactNode } from "react";

import { DateCalendar } from "@/shared/components/forms/date-calendar";

const toDate = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
};

export type DateInputProps = {
  label?: ReactNode;
  /** Accessible name for the calendar button and, without a visible label, the field. */
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  minValue?: string | null;
  maxValue?: string | null;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
  /** Yardım metni (alanın altında). */
  description?: ReactNode;
  /** Form gönderiminde ISO tarihle (YYYY-MM-DD) gizli alan olarak gönderilir. */
  name?: string;
};

/**
 * #586: Tarih alanı yerel biçimde (TR/DE: GG.AA.YYYY) gösterilir; tarayıcının yerel ayarına bağlı yerel
 * `<input type="date">` (ör. mm/dd/yyyy) yerine bunu kullanın.
 */
export function DateInput({ label, ariaLabel, value, onChange, minValue, maxValue, isRequired, isDisabled, className, description, name }: DateInputProps) {
  const min = toDate(minValue) ?? undefined;
  const max = toDate(maxValue) ?? undefined;
  return (
    <DatePicker
      granularity="day"
      hideTimeZone
      value={toDate(value)}
      onChange={(next) => onChange(next ? next.toString() : "")}
      minValue={min}
      maxValue={max}
      isRequired={isRequired}
      isDisabled={isDisabled}
      aria-label={label ? undefined : ariaLabel}
      className={className}
      name={name}
    >
      {label ? <Label>{label}</Label> : null}
      <DateField.Group>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger aria-label={ariaLabel}>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      {description ? <Description>{description}</Description> : null}
      <DatePicker.Popover>
        <DateCalendar label={ariaLabel} minValue={min} maxValue={max} />
      </DatePicker.Popover>
    </DatePicker>
  );
}
