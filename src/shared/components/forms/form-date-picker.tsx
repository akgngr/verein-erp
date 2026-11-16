"use client";
import {
  DatePicker,
  DateField,
  Label,
  Description,
  FieldError,
} from "@heroui/react";
import { DateCalendar } from "@/shared/components/forms/date-calendar";

import { parseDate, type DateValue } from "@internationalized/date";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

export type FormDatePickerProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  control: Control<T>;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  labelPlacement?: "inside" | "outside" | "outside-left";
  /** İzin verilen en erken / en geç tarih ("yyyy-MM-dd"); takvimde dışındaki günler seçilemez. */
  minValue?: string | null;
  maxValue?: string | null;
};

const toDate = (raw: string | null | undefined): DateValue | undefined => {
  if (!raw) return undefined;
  try {
    return parseDate(raw);
  } catch {
    return undefined;
  }
};

/**
 * HeroUI DatePicker + react-hook-form Controller sarmalayıcısı (10.4).
 *
 * KARAR: Form değerinin tipi "yyyy-MM-dd" biçimli string'dir; HeroUI'nin
 * CalendarDate değerine çevrilerek kullanılır. Yerelleştirme React Aria I18nProvider
 * (arayüz diline göre de-DE / tr-TR) üzerinden sağlanır.
 */
export function FormDatePicker<T extends FieldValues>({
  name,
  label,
  control,
  description,
  isRequired,
  isDisabled,
  labelPlacement = "outside",
  minValue,
  maxValue,
}: FormDatePickerProps<T>) {
  const translateMessage = useTranslateMessage();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const raw = typeof field.value === "string" ? field.value : "";
        let value: DateValue | null = null;
        if (raw) {
          try {
            value = parseDate(raw);
          } catch {
            value = null;
          }
        }
        return (
          <DatePicker
            name={field.name}
            onBlur={field.onBlur}
            className={
              labelPlacement === "outside-left"
                ? "sm:grid sm:grid-cols-[10rem_1fr] sm:items-start sm:gap-3"
                : undefined
            }
            id={`form-date-${String(name)}`}
            isRequired={isRequired}
            isDisabled={isDisabled}
            value={value}
            minValue={toDate(minValue)}
            maxValue={toDate(maxValue)}
            onChange={(next) => field.onChange(next ? next.toString() : "")}
            isInvalid={Boolean(fieldState.error)}
          >
            <Label>{label}</Label>
            <DateField.Group>
              <DateField.Input>
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateField.Suffix>
                <DatePicker.Trigger ref={field.ref} aria-label={String(label)}>
                  <DatePicker.TriggerIndicator />
                </DatePicker.Trigger>
              </DateField.Suffix>
            </DateField.Group>
            <Description>{description}</Description>
            <FieldError>
              {translateMessage(fieldState.error?.message)}
            </FieldError>
            <DatePicker.Popover>
              <DateCalendar
                label={String(label)}
                minValue={toDate(minValue)}
                maxValue={toDate(maxValue)}
              />
            </DatePicker.Popover>
          </DatePicker>
        );
      }}
    />
  );
}
