"use client";

import { DatePicker } from "@heroui/react";
import { parseDate, type DateValue } from "@internationalized/date";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

export type FormDatePickerProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  control: Control<T>;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
};

/**
 * HeroUI DatePicker + react-hook-form Controller sarmalayıcısı (10.4).
 *
 * KARAR: Form değerinin tipi "yyyy-MM-dd" biçimli string'dir; HeroUI'nin
 * CalendarDate değerine çevrilerek kullanılır. Yerelleştirme HeroUIProvider
 * locale="tr-TR" üzerinden sağlanır.
 */
export function FormDatePicker<T extends FieldValues>({
  name,
  label,
  control,
  description,
  isRequired,
  isDisabled,
}: FormDatePickerProps<T>) {
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
            label={label}
            description={description}
            isRequired={isRequired}
            isDisabled={isDisabled}
            value={value}
            onChange={(next) => field.onChange(next ? next.toString() : "")}
            isInvalid={Boolean(fieldState.error)}
            errorMessage={fieldState.error?.message}
          />
        );
      }}
    />
  );
}
