"use client";
import { Button } from "@heroui/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

/** A localized action next to a controlled input. */
export function FieldClearButton({
  onPress,
  isDisabled,
}: {
  onPress: () => void;
  isDisabled?: boolean;
}) {
  const t = useTranslations("common");
  return (
    <Button
      isIconOnly
      size="sm"
      variant="tertiary"
      aria-label={t("clear")}
      onPress={onPress}
      isDisabled={isDisabled}
      className="size-7 min-w-0"
    >
      <X className="size-3.5" aria-hidden />
    </Button>
  );
}
