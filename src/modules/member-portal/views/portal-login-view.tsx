import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PortalLoginForm } from "../components/portal-login-form";
import { isPortalEnabled } from "../services/auth-core";

export async function PortalLoginView() {
  if (!isPortalEnabled()) notFound();
  const t = await getTranslations("member-portal");

  return (
    <main className="mx-auto max-w-md space-y-6 rounded-2xl border border-ink-200 bg-surface p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink-900">{t("login.title")}</h1>
        <p className="text-sm text-ink-600">{t("login.subtitle")}</p>
      </div>
      <PortalLoginForm />
    </main>
  );
}
