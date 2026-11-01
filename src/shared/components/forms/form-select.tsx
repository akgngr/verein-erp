"use client";

import { Select, SelectItem } from "@heroui/react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { useTranslations } from "next-intl";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

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
  placeholder,
  isDisabled,
  labelPlacement = "outside",
}: FormSelectProps<T>) {
  const translateMessage = useTranslateMessage();
  const tCommon = useTranslations("common");
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value = field.value ? String(field.value) : "";
        const error = translateMessage(fieldState.error?.message);
        // KARAR: HeroUI Select'te labelPlacement="outside" + description/errorMessage birlikte
        // verilince etiket alanın içine kayıyor (yükseklik hesabı hatası). Yardım ve hata metni
        // bu yüzden Select'in DIŞINDA, aynı görünümle çizilir.
        return (
          <div className="flex flex-col gap-1">
          <Select
            id={`form-select-${String(name)}`}
            label={label}
            labelPlacement={labelPlacement}
            isRequired={isRequired}
            placeholder={placeholder ?? tCommon("selectPlaceholder")}
            isDisabled={isDisabled}
            selectedKeys={value ? [value] : []}
            onSelectionChange={(keys) => {
              const key = keys === "all" ? undefined : Array.from(keys)[0];
              field.onChange(key !== undefined ? String(key) : "");
            }}
            isInvalid={Boolean(fieldState.error)}
            aria-describedby={error || description ? `form-select-${String(name)}-help` : undefined}
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
          {error || description ? (
            <p id={`form-select-${String(name)}-help`} className={`px-1 text-tiny ${error ? "text-danger" : "text-default-500"}`}>
              {error || description}
            </p>
          ) : null}
          </div>
        );
      }}
    />
  );
}
