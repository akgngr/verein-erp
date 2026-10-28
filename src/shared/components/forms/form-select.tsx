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
  labelPlacement?: "inside" | "outside" | "outside-left";
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
  labelPlacement = "outside",
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value = field.value ? String(field.value) : "";
        return (
          <Select
            id={`form-select-${String(name)}`}
            label={label}
            labelPlacement={labelPlacement}
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
            classNames={{
              label: "text-small font-medium text-foreground pb-1",
              trigger: "shadow-xs border-default-200 hover:border-default-400 focus-within:!border-primary transition-colors bg-default-50/50 hover:bg-default-100/50 focus-within:!bg-background",
            }}
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
