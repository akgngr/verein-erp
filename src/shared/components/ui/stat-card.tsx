"use client";

import type { ReactNode } from "react";

import { SurfaceCard } from "./surface-card";
import { cn } from "@/shared/utils";

export function StatCard({
  label,
  value,
  valueClassName,
  className,
  icon,
}: {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <SurfaceCard
      interactive
      className={className}
      contentClassName="flex items-start justify-between gap-3 px-4 py-3"
    >
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-ink-400">{label}</p>
        <p className={cn("mt-1 text-base font-semibold text-foreground", valueClassName)}>
          {value}
        </p>
      </div>
      {icon ? <div className="shrink-0 text-ink-400">{icon}</div> : null}
    </SurfaceCard>
  );
}
