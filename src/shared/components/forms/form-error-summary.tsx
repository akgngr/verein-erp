"use client";

import { AlertCircle } from "lucide-react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

/** Form seviyesindeki genel hata gösterimi (10.4 FormErrorSummary). */
export function FormErrorSummary({ message }: { message?: string | null }) {
  const translateMessage = useTranslateMessage();
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-2.5 rounded-xl border border-danger-200 bg-danger-50/70 px-4 py-3 text-small text-danger-700 dark:border-danger-900/50 dark:bg-danger-950/30 dark:text-danger-300"
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden />
      <span>{translateMessage(message)}</span>
    </div>
  );
}
