"use client";

import { Checkbox, Description, Label } from "@heroui/react";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils";

export type CheckboxFieldProps = {
  label: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  isDisabled?: boolean;
  isIndeterminate?: boolean;
  ariaLabel?: string;
  id?: string;
  name?: string;
  value?: string;
  className?: string;
};

/** Checkbox with a (possibly rich) label and optional help text. */
export function CheckboxField({ label, description, checked, defaultChecked, onChange, isDisabled, isIndeterminate, ariaLabel, id, name, value, className }: CheckboxFieldProps) {
  return (
    <Checkbox
      id={id}
      name={name}
      value={value}
      isSelected={checked}
      defaultSelected={defaultChecked}
      onChange={onChange}
      isDisabled={isDisabled}
      isIndeterminate={isIndeterminate}
      aria-label={ariaLabel}
      className={cn("max-w-none", className)}
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Label className="w-full">{label}</Label>
      </Checkbox.Content>
      {description ? <Description>{description}</Description> : null}
    </Checkbox>
  );
}
