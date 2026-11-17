"use client";

import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { SurfaceCard } from "@/shared/components/ui/surface-card";
import { LoginForm } from "../components/login-form";

/** Login yüzeyi ortak SurfaceCard sözleşmesini kullanır. */
export function LoginView({ passive }: { passive?: boolean }) {
  const t = useTranslations("auth");
  const header = (
    <div className="flex w-full flex-col items-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm">
        <Building2 className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t("appTitle")}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{t("loginSubtitle")}</p>
      </div>
    </div>
  );

  return (
    <SurfaceCard
      className="w-full max-w-md rounded-2xl shadow-none"
      header={header}
      headerClassName="px-8 pt-9 pb-2"
      contentClassName="gap-4 px-8 pb-9 pt-4"
    >
      {passive ? (
        <div
          role="alert"
          className="rounded-xl border border-warning-200 bg-warning-50/70 px-4 py-3 text-sm text-warning-700 dark:border-warning-900/50 dark:bg-warning-950/30 dark:text-warning-300"
        >
          {t("passiveNotice")}
        </div>
      ) : null}
      <LoginForm />
    </SurfaceCard>
  );
}
