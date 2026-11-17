"use client";

import { Label, ListBox, Select } from "@heroui/react";

export type SelectFieldOption = {
  value: string;
  label: string;
};

export function SelectField({
  id,
  label,
  ariaLabel,
  value,
  options,
  placeholder,
  isRequired,
  isDisabled,
  isInvalid,
  className,
  triggerClassName,
  onChange,
}: {
  id?: string;
  label?: string;
  ariaLabel: string;
  value: string | null;
  options: SelectFieldOption[];
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  className?: string;
  triggerClassName?: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <Select
      id={id}
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      className={className}
      onChange={(selectedValue) =>
        onChange(selectedValue === null ? null : String(selectedValue))
      }
    >
      {label ? <Label>{label}</Label> : null}
      <Select.Trigger className={triggerClassName}>
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
    </Select>
  );
}
