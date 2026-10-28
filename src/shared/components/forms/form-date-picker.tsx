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
  labelPlacement?: "inside" | "outside" | "outside-left";
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
  labelPlacement = "outside",
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
            id={`form-date-picker-${String(name)}`}
            label={label}
            labelPlacement={labelPlacement}
            description={description}
            isRequired={isRequired}
            isDisabled={isDisabled}
            value={value}
            onChange={(next) => field.onChange(next ? next.toString() : "")}
            isInvalid={Boolean(fieldState.error)}
            errorMessage={fieldState.error?.message}
            classNames={{
              label: "text-small font-medium text-foreground pb-1",
              inputWrapper: "shadow-xs border-default-200 hover:border-default-400 focus-within:!border-primary transition-colors bg-default-50/50 hover:bg-default-100/50 focus-within:!bg-background",
            }}
          />
        );
      }}
    />
  );
}
