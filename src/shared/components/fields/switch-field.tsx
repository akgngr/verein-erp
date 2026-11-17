"use client";

import { Description, Label, Switch } from "@heroui/react";
import type { ReactNode } from "react";

export type SwitchFieldProps = {
  label: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  isDisabled?: boolean;
  ariaLabel?: string;
  id?: string;
  name?: string;
  className?: string;
};

/** On/off toggle for settings that take effect immediately or on save. */
export function SwitchField({ label, description, checked, defaultChecked, onChange, isDisabled, ariaLabel, id, name, className }: SwitchFieldProps) {
  return (
    <Switch id={id} name={name} isSelected={checked} defaultSelected={defaultChecked} onChange={onChange} isDisabled={isDisabled} aria-label={ariaLabel} className={className}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Label>{label}</Label>
      </Switch.Content>
      {description ? <Description>{description}</Description> : null}
    </Switch>
  );
}
