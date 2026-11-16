"use client";

import {
  Description,
  FieldError,
  Label,
  ListBox,
  Select,
} from "@heroui-v3/react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/utils";
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
        return (
          <Select
            id={`form-select-${String(name)}`}
            name={field.name}
            value={value || null}
            onChange={(key) => field.onChange(key === null ? "" : String(key))}
            onBlur={field.onBlur}
            isRequired={isRequired}
            isDisabled={isDisabled}
            isInvalid={Boolean(fieldState.error)}
            placeholder={placeholder ?? tCommon("selectPlaceholder")}
            className={cn(
              "w-full",
              labelPlacement === "outside-left" &&
                "grid grid-cols-[minmax(7rem,1fr)_2fr] items-start gap-x-4",
            )}
          >
            <Label className="text-[13px] font-medium">{label}</Label>
            <Select.Trigger ref={field.ref}>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {options.map((option) => (
                  <ListBox.Item
                    key={option.value}
                    id={option.value}
                    textValue={option.label}
                  >
                    <Label>{option.label}</Label>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
            {description ? <Description>{description}</Description> : null}
            <FieldError>{error}</FieldError>
          </Select>
        );
      }}
    />
  );
}
