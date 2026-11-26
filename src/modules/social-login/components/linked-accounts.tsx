"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/shared/components/ui/action-button";
import { SurfaceCard } from "@/shared/components/ui/surface-card";
import { unlinkProviderAction, linkProviderAction } from "../actions/identities";
import type { ProviderId } from "../constants";

export function LinkedAccounts({ linked, available }: { linked: ProviderId[]; available: ProviderId[] }) {
  const t = useTranslations("social-login");
  const [password, setPassword] = useState("");
  const [unlinkPassword, setUnlinkPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [selected, setSelected] = useState<ProviderId | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState<ProviderId | null>(null);
  async function unlink(provider: ProviderId) {
    setPending(true);
    setMessage("");
    try {
      const result = await unlinkProviderAction({ provider, password: unlinkPassword, otp: otp || undefined });
      setMessage(result.ok ? t("unlinked") : result.error);
      if (result.ok) { setConfirming(null); window.location.assign("/giris?pasif=1"); }
    } catch { setMessage(t("errors.invalid")); }
    finally { setUnlinkPassword(""); setOtp(""); setPending(false); }
  }
  async function link() {
    if (!selected || !password) return;
    setPending(true);
    setMessage("");
    try {
      const result = await linkProviderAction({ provider: selected, password });
      if (!result.ok) setMessage(result.error);
    } finally { setPassword(""); setPending(false); }
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
              <label className="text-sm">{t("password")}<input type="password" autoComplete="current-password" value={unlinkPassword} onChange={(e) => setUnlinkPassword(e.target.value)} className="block rounded border p-2" /></label>
              <label className="text-sm">{t("otp")}<input autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} className="block rounded border p-2" /></label>
              <ActionButton tone="danger" disabled={pending || !unlinkPassword} pending={pending} onClick={() => void unlink(id)}>{t("unlink")}</ActionButton>
              <ActionButton tone="neutral" disabled={pending} onClick={() => { setConfirming(null); setUnlinkPassword(""); setOtp(""); }}>{t("cancel")}</ActionButton>
            </div>
          ) : <ActionButton tone="neutral" disabled={pending} onClick={() => setConfirming(id)}>{t("unlink")}</ActionButton>}
        </div>
      ))}
      {available.filter((id) => !linked.includes(id)).map((id) => (
        <ActionButton key={id} tone="neutral" disabled={pending} onClick={() => { setSelected(id); setPassword(""); }}>{t("link", { provider: t(`providers.${id}`) })}</ActionButton>
      ))}
      {selected && <div className="flex flex-col gap-2">
        <label className="text-sm">{t("password")}<input type="password" autoComplete="current-password" className="block w-full rounded-lg border border-ink-200 bg-surface p-2" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <p className="text-xs text-ink-500">{t("linkHint")}</p>
        <ActionButton disabled={pending || !password} pending={pending} onClick={() => void link()}>{t("continue")}</ActionButton>
        <ActionButton tone="neutral" disabled={pending} onClick={() => { setSelected(null); setPassword(""); }}>{t("cancel")}</ActionButton>
      </div>}
      <p role="status" className="text-sm">{message}</p>
    </SurfaceCard>
  );
}
