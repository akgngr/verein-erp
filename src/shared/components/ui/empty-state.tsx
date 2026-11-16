import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-ink-200/80 bg-ink-50/50 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-400">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      ) : null}
      <p className="text-base font-semibold text-foreground/80">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-ink-500">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
