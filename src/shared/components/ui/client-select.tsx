"use client";

import { Input, Select, type SelectProps } from "@heroui/react";

import { useHydrated } from "@/shared/hooks/use-hydrated";

/**
 * HeroUI Select whose react-aria ids can differ between SSR and the client
 * render (hydration mismatch on the hidden <select>/trigger). Until hydration
 * completes a disabled input with the same label and size is shown, then the
 * real Select. Drop-in replacement: same props and children as Select.
 */
export function ClientSelect<T extends object>(props: SelectProps<T>) {
  const hydrated = useHydrated();
  if (hydrated) return <Select {...props} />;
  return (
    <Input
      isDisabled
      aria-hidden
      label={props.label}
      labelPlacement={props.labelPlacement}
      size={props.size}
      variant={props.variant}
      className={props.className}
      fullWidth={props.fullWidth}
      value=""
    />
  );
}
