"use client";

import { Button } from "@heroui/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/utils";
import type { DataTableBulkAction } from "./types";

export function DataTableBulkActionBar({
  selectedCount,
  actions,
  onClear,
  className,
}: {
  selectedCount: number;
  actions: DataTableBulkAction[];
  onClear: () => void;
  className?: string;
}) {
  const tTable = useTranslations("common.table");
  const visibleActions = actions.filter((action) => !action.hidden);

  if (selectedCount < 1 || visibleActions.length < 1) return null;

  return (
    <div
      className={cn(
        "erp-motion-enter flex flex-wrap items-center gap-2 rounded-xl border border-brand-200/80 bg-brand-50/80 px-3 py-2 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/10",
        className,
      )}
      role="region"
      aria-label={tTable("bulkActions")}
    >
      <span className="mr-1 text-sm font-semibold text-foreground">
        {tTable("selectedCount", { count: selectedCount })}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {visibleActions.map((action) => (
          <Button
            key={action.key}
            size="sm"
            variant={action.variant === "danger" ? "danger-soft" : "secondary"}
            isDisabled={action.disabled}
            onPress={action.onPress}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>

      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        className="ml-auto"
        aria-label={tTable("clearSelection")}
        onPress={onClear}
      >
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
