"use client";

import { Snippet } from "@heroui/react";
import { useTranslations } from "next-intl";

export type InviteResult = { temporaryPassword: string; mailSent: boolean; email?: string };

/** Davet sonucu: geçici parola yalnızca burada, bir kez gösterilir. */
export function InviteResultNotice({ result }: { result: InviteResult }) {
  const t = useTranslations("courses.invite");
  return (
    <div className="flex flex-col gap-3 rounded-medium border border-success-200 bg-success-50/50 p-4 dark:border-success-500/30 dark:bg-success-500/10">
      <p className="text-small font-semibold">{t("title")}</p>
      <p className="text-small">{result.mailSent ? t("mailSent", { email: result.email ?? "" }) : t("mailNotSent")}</p>
      <div className="flex flex-col gap-1">
        <span className="text-tiny text-default-500">{t("temporaryPassword")}</span>
        <Snippet symbol="" variant="bordered" className="self-start font-mono">
          {result.temporaryPassword}
        </Snippet>
      </div>
      <p className="text-tiny text-default-500">{t("onceHint")}</p>
    </div>
  );
}
