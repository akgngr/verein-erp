"use client";
import { CopyValue } from "@/shared/components/ui/copy-value";

import { useTranslations } from "next-intl";

export type InviteResult = {
  temporaryPassword: string;
  mailSent: boolean;
  email?: string;
};

/** Davet sonucu: geçici parola yalnızca burada, bir kez gösterilir. */
export function InviteResultNotice({ result }: { result: InviteResult }) {
  const t = useTranslations("courses.invite");
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-success-200 bg-success-50/50 p-4 dark:border-success-500/30 dark:bg-success-500/10">
      <p className="text-sm font-semibold">{t("title")}</p>
      <p className="text-sm">
        {result.mailSent
          ? t("mailSent", { email: result.email ?? "" })
          : t("mailNotSent")}
      </p>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-ink-500">{t("temporaryPassword")}</span>
        <CopyValue
          value={result.temporaryPassword}
          className={"self-start font-mono"}
        />
      </div>
      <p className="text-xs text-ink-500">{t("onceHint")}</p>
    </div>
  );
}
