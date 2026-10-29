"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { LoginForm } from "../components/login-form";

/**
 * KARAR: HeroUI v2 bileşenleri "use client" banner'ı taşımaz; bu yüzden HeroUI
 * kullanan her bileşen client bileşen olmalıdır. LoginView yalnızca LoginForm'u
 * sardığı için client tarafında güvenle kullanılır.
 */
export function LoginView({ passive }: { passive?: boolean }) {
  const t = useTranslations("auth");
  return (
    <Card className="w-full max-w-md border border-default-200/80 shadow-md rounded-2xl" shadow="none">
      <CardHeader className="flex flex-col items-center text-center gap-3 px-8 pt-9 pb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Building2 className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t("appTitle")}</h1>
          <p className="mt-1 text-small text-default-500">{t("loginSubtitle")}</p>
        </div>
      </CardHeader>
      <CardBody className="gap-4 px-8 pb-9 pt-4">
        {passive ? (
          <div
            role="alert"
            className="rounded-xl border border-warning-200 bg-warning-50/70 px-4 py-3 text-small text-warning-700 dark:border-warning-900/50 dark:bg-warning-950/30 dark:text-warning-300"
          >
            {t("passiveNotice")}
          </div>
        ) : null}
        <LoginForm />
      </CardBody>
    </Card>
  );
}
