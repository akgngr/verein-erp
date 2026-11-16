"use client";
import { Button, toast } from "@heroui/react";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";

/** A copyable value; the clipboard action never logs its contents. */
export function CopyValue({
  value,
  className,
  truncate = false,
}: {
  value: string;
  className?: string;
  truncate?: boolean;
}) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t("copied"));
    } catch {
      toast.danger(t("copyFailed"));
    }
  };
  return (
    <div
      className={cn(
        "flex max-w-full items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-1.5",
        className,
      )}
    >
      <code
        className={cn("min-w-0 text-sm", truncate ? "truncate" : "break-all")}
      >
        {value}
      </code>
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label={t("copy")}
        onPress={() => void copy()}
        className="shrink-0"
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}
