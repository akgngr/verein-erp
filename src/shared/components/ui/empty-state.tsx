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
        "flex flex-col items-center justify-center gap-2 rounded-medium border border-default-200 bg-default-50 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="mb-1 h-10 w-10 text-default-300" aria-hidden /> : null}
      <p className="text-medium font-medium text-default-600">{title}</p>
      {description ? <p className="max-w-md text-small text-default-500">{description}</p> : null}
      {children}
    </div>
  );
}
