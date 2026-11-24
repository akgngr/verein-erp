import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Button } from "@/shared/components/kit";

import { isPortalEnabled } from "../services/auth-core";

/**
 * Scanner-safe confirm page: GET only displays the confirmation button;
 * the magic-link token is consumed exclusively on POST /api/member-portal/confirm.
 */
export async function PortalConfirmView({ token }: { token: string }) {
  if (!isPortalEnabled()) notFound();
  const t = await getTranslations("member-portal");

  return (
    <main className="mx-auto max-w-md space-y-6 rounded-2xl border border-ink-200 bg-surface p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink-900">{t("confirm.title")}</h1>
        <p className="text-sm text-ink-600">{t("confirm.subtitle")}</p>
      </div>
      {token ? (
        <form action="/api/member-portal/confirm" method="POST" className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <Button type="submit" variant="primary">
            {t("confirm.submitButton")}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-danger">{t("confirm.missingToken")}</p>
      )}
    </main>
  );
}
