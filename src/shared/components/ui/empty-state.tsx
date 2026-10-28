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
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-default-200/80 bg-default-50/50 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-default-100 text-default-400">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      ) : null}
      <p className="text-medium font-semibold text-foreground/80">{title}</p>
      {description ? <p className="max-w-md text-small text-default-500">{description}</p> : null}
      {children}
    </div>
  );
}
