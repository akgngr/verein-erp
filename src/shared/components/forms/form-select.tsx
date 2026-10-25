"use client";

import { Select, SelectItem } from "@heroui/react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

export type FormSelectOption = { value: string; label: string };

export type FormSelectProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  control: Control<T>;
  options: FormSelectOption[];
  description?: string;
  isRequired?: boolean;
  placeholder?: string;
  isDisabled?: boolean;
};

/** HeroUI Select + react-hook-form Controller sarmalayıcısı (10.4). Değer tipi string'dir. */
export function FormSelect<T extends FieldValues>({
  name,
  label,
  control,
  options,
  description,
  isRequired,
  placeholder = "Seçin",
  isDisabled,
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value = field.value ? String(field.value) : "";
        return (
          <Select
            label={label}
            description={description}
            isRequired={isRequired}
            placeholder={placeholder}
            isDisabled={isDisabled}
            selectedKeys={value ? [value] : []}
            onSelectionChange={(keys) => {
              const key = keys === "all" ? undefined : Array.from(keys)[0];
              field.onChange(key !== undefined ? String(key) : "");
            }}
            isInvalid={Boolean(fieldState.error)}
            errorMessage={fieldState.error?.message}
          >
            {options.map((option) => (
              <SelectItem key={option.value} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        );
      }}
    />
  );
}
