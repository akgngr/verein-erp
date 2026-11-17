"use client";

import { Card } from "@heroui/react";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils";

export function SurfaceCard({
  children,
  className,
  header,
  headerClassName,
  contentClassName,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  headerClassName?: string;
  contentClassName?: string;
  interactive?: boolean;
}) {
  return (
    <Card
      className={cn(
        "erp-motion-enter border border-ink-200/80 bg-surface shadow-sm",
        interactive && "erp-motion-interactive hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {header ? (
        <Card.Header className={cn("pb-0", headerClassName)}>
          {header}
        </Card.Header>
      ) : null}
      <Card.Content className={cn(contentClassName)}>{children}</Card.Content>
    </Card>
  );
}
