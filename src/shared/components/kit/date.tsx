"use client";

/**
 * UI kit — date and date-time inputs (W3). Values are ISO strings ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm";
 * "" = empty) so modules never handle framework date objects. The segments follow the UI locale (TR/DE:
 * DD.MM.YYYY, 24 h) via the React Aria I18nProvider, unlike a native `<input type="date">`, which uses the
 * browser's locale (e.g. mm/dd/yyyy).
 */
import { parseDate, parseDateTime } from "@internationalized/date";
import { DateField, DatePicker, Description, FieldError, Label } from "@heroui/react";
import type { ReactNode } from "react";

import { DateCalendar } from "@/shared/components/forms/date-calendar";

const toDate = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return parseDate(value.slice(0, 10));
  } catch {
    return null;
  }
};

const toDateTime = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return parseDateTime(value.length === 10 ? `${value}T00:00` : value.slice(0, 16));
  } catch {
    return null;
  }
};

/** CalendarDateTime → "YYYY-MM-DDTHH:mm" (the value format of a native datetime-local input). */
const fromDateTime = (value: { toString(): string } | null) => (value ? value.toString().slice(0, 16) : "");

type CommonProps = {
  label?: ReactNode;
  /** Accessible name for the calendar button and, without a visible label, the field. */
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  minValue?: string | null;
  maxValue?: string | null;
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  className?: string;
  /** Help text below the field. */
  description?: ReactNode;
  /** Shown when `isInvalid` is true. */
  errorMessage?: ReactNode;
  /** Submitted as a hidden form field with the ISO value. */
  name?: string;
};

export type DateInputProps = CommonProps;
export type DateTimeInputProps = CommonProps;

type CalendarBound = ReturnType<typeof toDate>;

function PickerParts({ label, ariaLabel, description, errorMessage, isInvalid, min, max }: Pick<CommonProps, "label" | "ariaLabel" | "description" | "errorMessage" | "isInvalid"> & { min: CalendarBound; max: CalendarBound }) {
  return (
    <>
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
      {isInvalid && errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
      <DatePicker.Popover>
        <DateCalendar label={ariaLabel} minValue={min ?? undefined} maxValue={max ?? undefined} />
      </DatePicker.Popover>
    </>
  );
}

/** Date field (day precision). Prefer this over `<Input type="date">`. */
export function DateInput({ label, ariaLabel, value, onChange, minValue, maxValue, isRequired, isDisabled, isInvalid, className, description, errorMessage, name }: DateInputProps) {
  const min = toDate(minValue);
  const max = toDate(maxValue);
  return (
    <DatePicker
      granularity="day"
      hideTimeZone
      value={toDate(value)}
      onChange={(next) => onChange(next ? next.toString() : "")}
      minValue={min ?? undefined}
      maxValue={max ?? undefined}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      aria-label={label ? undefined : ariaLabel}
      className={className}
      name={name}
    >
      <PickerParts label={label} ariaLabel={ariaLabel} description={description} errorMessage={errorMessage} isInvalid={isInvalid} min={min} max={max} />
    </DatePicker>
  );
}

/** Date and time field (minute precision, 24 h in TR/DE). Prefer this over `<Input type="datetime-local">`. */
export function DateTimeInput({ label, ariaLabel, value, onChange, minValue, maxValue, isRequired, isDisabled, isInvalid, className, description, errorMessage, name }: DateTimeInputProps) {
  return (
    <DatePicker
      granularity="minute"
      hideTimeZone
      hourCycle={24}
      value={toDateTime(value)}
      onChange={(next) => onChange(fromDateTime(next))}
      minValue={toDateTime(minValue) ?? undefined}
      maxValue={toDateTime(maxValue) ?? undefined}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      aria-label={label ? undefined : ariaLabel}
      className={className}
      name={name}
    >
      <PickerParts label={label} ariaLabel={ariaLabel} description={description} errorMessage={errorMessage} isInvalid={isInvalid} min={toDate(minValue)} max={toDate(maxValue)} />
    </DatePicker>
  );
}
