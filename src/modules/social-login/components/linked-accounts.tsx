"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/shared/components/ui/action-button";
import { SurfaceCard } from "@/shared/components/ui/surface-card";
import { unlinkProviderAction } from "../actions/identities";
import type { ProviderId } from "../constants";

export function LinkedAccounts({ linked }: { linked: ProviderId[] }) {
  const t = useTranslations("social-login");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState<ProviderId | null>(null);
  async function unlink(provider: ProviderId) {
    setPending(true);
    setMessage("");
    try {
      const result = await unlinkProviderAction({ provider });
      setMessage(result.ok ? t("unlinked") : result.error);
      if (result.ok) setConfirming(null);
    } catch { setMessage(t("errors.invalid")); }
    finally { setPending(false); }
  }
  return (
    <SurfaceCard contentClassName="flex flex-col gap-3 p-5">
      <h2 className="font-semibold">{t("linkedAccounts")}</h2>
      {linked.length === 0 && <p className="text-sm text-ink-500">{t("noLinkedAccounts")}</p>}
      {linked.map((id) => (
        <div key={id} className="flex flex-wrap items-center justify-between gap-2">
          <span>{t(`providers.${id}`)}</span>
          {confirming === id ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">{t("confirmUnlink")}</span>
              <ActionButton tone="danger" disabled={pending} pending={pending} onClick={() => void unlink(id)}>{t("unlink")}</ActionButton>
              <ActionButton tone="neutral" disabled={pending} onClick={() => setConfirming(null)}>{t("cancel")}</ActionButton>
            </div>
          ) : <ActionButton tone="neutral" disabled={pending} onClick={() => setConfirming(id)}>{t("unlink")}</ActionButton>}
        </div>
      ))}
      <p role="status" className="text-sm">{message}</p>
    </SurfaceCard>
  );
}
