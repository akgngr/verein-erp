"use client";

/**
 * UI kit — choice controls (W3): Select, Checkbox, CheckboxGroup, Switch, RadioGroup/Radio, Slider, ComboBox.
 * The framework's internal parts (trigger, popover, listbox, control, indicator, thumb, track) are rendered here,
 * so modules only declare the semantic structure.
 */
import {
  Checkbox as HCheckbox, CheckboxGroup as HCheckboxGroup, ComboBox as HComboBox, ListBox, Radio as HRadio,
  RadioGroup as HRadioGroup, Select as HSelect, Slider as HSlider, Switch as HSwitch,
} from "@heroui/react";
import { Children, isValidElement, type CSSProperties, type Key, type ReactElement, type ReactNode } from "react";

import { cn } from "@/shared/utils";

type Base = { className?: string; children?: ReactNode; id?: string; "aria-label"?: string };

// ---------------------------------------------------------------- Select

export type SelectItemProps = { id: string; textValue: string; children?: ReactNode; className?: string; isDisabled?: boolean };
function SelectItem({ id, textValue, children, className, isDisabled }: SelectItemProps) {
  return (
    <ListBox.Item id={id} textValue={textValue} className={className} isDisabled={isDisabled}>
      {children}
      <ListBox.ItemIndicator />
    </ListBox.Item>
  );
}

type SingleSelect = { selectionMode?: "single"; value?: string | null; onChange?: (value: string | number | null) => void };
type MultiSelect = { selectionMode: "multiple"; value?: readonly string[]; onChange?: (value: (string | number)[]) => void };
export type SelectProps = Base & (SingleSelect | MultiSelect) & {
  placeholder?: string; isDisabled?: boolean; isInvalid?: boolean; isRequired?: boolean; name?: string;
  /** Compact trigger height for dense forms and toolbars. */
  size?: "sm" | "md";
};

/** Children: any label/description nodes plus <Select.Item> elements (also from arrays/maps). */
function SelectRoot({ children, size = "md", selectionMode = "single", className, ...props }: SelectProps) {
  const items: ReactElement[] = [];
  const rest: ReactNode[] = [];
  Children.toArray(children).forEach((child) => {
    if (isValidElement(child) && child.type === SelectItem) items.push(child);
    else rest.push(child);
  });
  return (
    <HSelect {...(props as Record<string, unknown>)} selectionMode={selectionMode} className={className}>
      {rest}
      <HSelect.Trigger className={size === "sm" ? "h-9 text-sm" : undefined}>
        <HSelect.Value />
        <HSelect.Indicator />
      </HSelect.Trigger>
      <HSelect.Popover>
        <ListBox selectionMode={selectionMode}>{items}</ListBox>
      </HSelect.Popover>
    </HSelect>
  );
}
export const Select = Object.assign(SelectRoot, { Item: SelectItem });

// ---------------------------------------------------------------- ComboBox

export type ComboBoxProps<T extends object> = Base & {
  value?: string | null; onChange?: (value: string | number | null) => void; inputValue?: string; onInputChange?: (value: string) => void;
  allowsCustomValue?: boolean; isDisabled?: boolean; isRequired?: boolean; isInvalid?: boolean; name?: string;
  defaultItems?: Iterable<T>;
};
/** Children: <Label>, <ComboBox.InputGroup> (input + trigger), <ComboBox.Popover><ComboBox.List>…</ComboBox.List></ComboBox.Popover>, help/error. */
function ComboBoxRoot<T extends object>({ children, onChange, ...props }: ComboBoxProps<T>) {
  return (
    <HComboBox {...(props as Record<string, unknown>)} onChange={(key: Key | null) => onChange?.(key === null ? null : typeof key === "string" || typeof key === "number" ? key : String(key))}>
      {children}
    </HComboBox>
  );
}
const ComboBoxInputGroup = ({ children, className }: Base) => <HComboBox.InputGroup className={className}>{children}</HComboBox.InputGroup>;
const ComboBoxTrigger = () => <HComboBox.Trigger />;
const ComboBoxPopover = ({ children, className }: Base) => <HComboBox.Popover className={className}>{children}</HComboBox.Popover>;
function ComboBoxList<T extends object>({ children }: { children: (item: T) => ReactElement }) {
  return <ListBox<T>>{children}</ListBox>;
}
const ComboBoxItem = ({ id, textValue, children, className }: SelectItemProps) => (
  <ListBox.Item id={id} textValue={textValue} className={className}>
    {children}
    <ListBox.ItemIndicator />
  </ListBox.Item>
);
export const ComboBox = Object.assign(ComboBoxRoot, { InputGroup: ComboBoxInputGroup, Trigger: ComboBoxTrigger, Popover: ComboBoxPopover, List: ComboBoxList, Item: ComboBoxItem });

// ---------------------------------------------------------------- Checkbox / Switch / Radio

export type CheckboxProps = Base & {
  isSelected?: boolean; defaultSelected?: boolean; onChange?: (selected: boolean) => void; isDisabled?: boolean;
  isInvalid?: boolean; isIndeterminate?: boolean; value?: string; name?: string; style?: CSSProperties;
};
/** Children are the label content (usually <Label>…</Label>). */
export function Checkbox({ children, className, ...props }: CheckboxProps) {
  return (
    <HCheckbox {...(props as Record<string, unknown>)} className={className}>
      <HCheckbox.Content>
        <HCheckbox.Control>
          <HCheckbox.Indicator />
        </HCheckbox.Control>
        {children}
      </HCheckbox.Content>
    </HCheckbox>
  );
}

export type CheckboxGroupProps = Base & { value?: string[]; onChange?: (value: string[]) => void; isDisabled?: boolean; name?: string };
export function CheckboxGroup(props: CheckboxGroupProps) {
  return <HCheckboxGroup {...(props as Record<string, unknown>)} />;
}

export type SwitchProps = Base & { isSelected?: boolean; defaultSelected?: boolean; onChange?: (selected: boolean) => void; isDisabled?: boolean; size?: "sm" | "md" | "lg"; name?: string };
/** Children are the label content (usually <Label>…</Label>). */
export function Switch({ children, ...props }: SwitchProps) {
  return (
    <HSwitch {...(props as Record<string, unknown>)}>
      <HSwitch.Content>
        <HSwitch.Control>
          <HSwitch.Thumb />
        </HSwitch.Control>
        {children}
      </HSwitch.Content>
    </HSwitch>
  );
}

export type RadioGroupProps = Base & { value?: string; defaultValue?: string; onChange?: (value: string) => void; isDisabled?: boolean; isRequired?: boolean; orientation?: "vertical" | "horizontal"; name?: string };
export function RadioGroup(props: RadioGroupProps) {
  return <HRadioGroup {...(props as Record<string, unknown>)} />;
}
export type RadioProps = Base & { value: string; isDisabled?: boolean };
/** Children are the label content (usually <Label>…</Label>). */
export function Radio({ children, className, value, ...props }: RadioProps) {
  return (
    <HRadio {...(props as Record<string, unknown>)} value={value}>
      <HRadio.Content className={className}>
        <HRadio.Control>
          <HRadio.Indicator />
        </HRadio.Control>
        {children}
      </HRadio.Content>
    </HRadio>
  );
}

// ---------------------------------------------------------------- Slider

export type SliderProps = Base & { value?: number; defaultValue?: number; onChange?: (value: number) => void; minValue?: number; maxValue?: number; step?: number; isDisabled?: boolean };
/** Children: optional label (<Label>); the value output, track and thumb are rendered here. */
export function Slider({ children, className, onChange, ...props }: SliderProps) {
  return (
    <HSlider {...(props as Record<string, unknown>)} onChange={(value: number | number[]) => onChange?.(Array.isArray(value) ? value[0] : value)} className={cn(className)}>
      {children}
      <HSlider.Output />
      <HSlider.Track>
        <HSlider.Fill />
        <HSlider.Thumb />
      </HSlider.Track>
    </HSlider>
  );
}
