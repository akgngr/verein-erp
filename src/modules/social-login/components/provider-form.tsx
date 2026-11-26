"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/shared/components/ui/action-button";
import { SurfaceCard } from "@/shared/components/ui/surface-card";
import { saveProviderAction } from "../actions/settings";
import type { ProviderId } from "../constants";

type Settings = { id: ProviderId; enabled: boolean; clientId: string; tenantId: string; hasSecret: boolean };

export function ProviderForm({ settings }: { settings: Settings }) {
  const t = useTranslations("social-login");
  const [enabled, setEnabled] = useState(settings.enabled);
  const [clientId, setClientId] = useState(settings.clientId);
  const [tenantId, setTenantId] = useState(settings.tenantId);
  const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setPending(true);
    setMessage("");
    try {
      const result = await saveProviderAction({ provider: settings.id, enabled, clientId, tenantId, secret });
      setMessage(result.ok ? t("saved") : result.error);
      if (result.ok) setSecret("");
    } catch { setMessage(t("errors.invalid")); }
    finally { setPending(false); }
  }
  return (
    <SurfaceCard contentClassName="flex flex-col gap-3 p-5">
      <h2 className="font-semibold">{t(`providers.${settings.id}`)}</h2>
      <label className="flex items-center gap-2"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />{t("enabled")}</label>
      <label className="flex flex-col gap-1 text-sm">{t("clientId")}<input className="rounded-lg border border-ink-200 bg-surface p-2" value={clientId} onChange={(e) => setClientId(e.target.value)} /></label>
      {settings.id === "microsoft-entra-id" && <label className="flex flex-col gap-1 text-sm">{t("tenantId")}<input className="rounded-lg border border-ink-200 bg-surface p-2" value={tenantId} onChange={(e) => setTenantId(e.target.value)} /></label>}
      <label className="flex flex-col gap-1 text-sm">{t("secret")}<input type="password" autoComplete="new-password" className="rounded-lg border border-ink-200 bg-surface p-2" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={settings.hasSecret ? t("stored") : ""} /></label>
      <p className="break-all text-xs text-ink-500">{t("callback")}: /api/auth/callback/{settings.id}</p>
      <ActionButton pending={pending} disabled={pending} onClick={() => void save()}>{t("save")}</ActionButton>
      <p role="status" className="text-sm">{message}</p>
    </SurfaceCard>
  );
}
