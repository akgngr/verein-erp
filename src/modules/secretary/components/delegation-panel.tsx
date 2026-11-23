"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, Input, Label, TextField } from "@/shared/components/kit";
import type { Briefing } from "@/shared/secretary/define";

import { createDelegationAction, getDelegatedBriefingAction, revokeDelegationAction } from "../actions/delegation";
import { isSafeSecretaryRoute } from "../views/advanced-workbench-policy";
import type { DelegationView } from "../services/delegation";

export type DelegationLabels = {
  title: string; description: string; userId: string; expiry: string; briefing: string; followUps: string;
  grant: string; revoke: string; confirm: string; cancel: string; view: string; close: string;
  given: string; received: string; empty: string; expired: string; success: string; error: string;
};

/** Only actual owner-scoped actions are offered. Delegated briefings are read-only. */
export function SecretaryDelegationPanel({ initialRows, labels }: { initialRows: DelegationView[]; labels: DelegationLabels }) {
  const [rows, setRows] = useState(initialRows);
  const [delegateId, setDelegateId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [scopes, setScopes] = useState<string[]>(["briefing.view"]);
  const [pending, setPending] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; briefing: Briefing } | null>(null);
  const [message, setMessage] = useState<"success" | "error" | null>(null);

  async function grant() {
    if (pending || !delegateId.trim() || !expiresAt || scopes.length === 0) return;
    setPending(true); setMessage(null);
    try {
      const result = await createDelegationAction({ delegateId: delegateId.trim(), expiresAt: `${expiresAt}T23:59:59`, scopes });
      if (!result.ok) { setMessage("error"); return; }
      // Server validates the selected user and expiration; refreshable list avoids assuming the name.
      const { listMyDelegationsAction } = await import("../actions/delegation");
      const latest = await listMyDelegationsAction({});
      if (!latest.ok) { setMessage("success"); return; }
      setRows(latest.data); setDelegateId(""); setExpiresAt(""); setMessage("success");
    } catch { setMessage("error"); } finally { setPending(false); }
  }

  async function revoke(id: string) {
    if (pending || confirmId !== id) { setConfirmId(id); return; }
    setPending(true); setMessage(null);
    try {
      const result = await revokeDelegationAction({ id });
      if (!result.ok) { setMessage("error"); return; }
      setRows((current) => current.filter((row) => row.id !== id));
      if (preview?.id === id) setPreview(null);
      setMessage("success");
    } catch { setMessage("error"); } finally { setPending(false); setConfirmId(null); }
  }

  async function view(row: DelegationView) {
    if (pending || !row.active || row.direction !== "received" || !row.scopes.includes("briefing.view")) return;
    setPending(true); setMessage(null); setPreview(null);
    try {
      const result = await getDelegatedBriefingAction({ delegationId: row.id });
      if (!result.ok) { setMessage("error"); return; }
      setPreview({ id: row.id, briefing: result.data.briefing });
    } catch { setMessage("error"); } finally { setPending(false); }
  }

  return (
    <section aria-label={labels.title} className="space-y-4 rounded-xl border border-ink-200/80 bg-surface p-4" aria-busy={pending}>
      <div><h2 className="font-semibold">{labels.title}</h2><p className="text-sm text-ink-500">{labels.description}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField isDisabled={pending}><Label>{labels.userId}</Label><Input value={delegateId} maxLength={64} onChange={(e) => setDelegateId(e.target.value)} /></TextField>
        <TextField isDisabled={pending}><Label>{labels.expiry}</Label><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></TextField>
      </div>
      <fieldset disabled={pending} className="flex flex-wrap gap-4 text-sm">
        <legend className="mb-2 font-medium">{labels.title}</legend>
        {(["briefing.view", "followUps.view"] as const).map((scope) => <label key={scope} className="flex items-center gap-2"><input type="checkbox" checked={scopes.includes(scope)} onChange={(e) => setScopes((current) => e.target.checked ? [...current, scope] : current.filter((x) => x !== scope))} />{scope === "briefing.view" ? labels.briefing : labels.followUps}</label>)}
      </fieldset>
      <Button isDisabled={pending || !delegateId.trim() || !expiresAt || scopes.length === 0} isPending={pending} onPress={() => void grant()}>{labels.grant}</Button>
      {message ? <p role={message === "error" ? "alert" : "status"} className={message === "error" ? "text-sm text-danger" : "text-sm text-success"}>{labels[message]}</p> : null}
      {rows.length === 0 ? <p className="text-sm text-ink-500">{labels.empty}</p> : (
        <ul className="space-y-2">{rows.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-200/80 p-3">
          <div className="min-w-0 text-sm"><p className="font-medium">{row.direction === "given" ? labels.given : labels.received}: {row.otherUserName}</p><p className="text-xs text-ink-500">{labels.expiry}: <time dateTime={row.expiresAt}>{row.expiresAt.slice(0, 10)}</time> · {row.active ? row.scopes.map((scope) => scope === "briefing.view" ? labels.briefing : labels.followUps).join(", ") : labels.expired}</p></div>
          <div className="flex flex-wrap gap-2">
            {row.direction === "received" && row.active && row.scopes.includes("briefing.view") ? <Button size="sm" variant="secondary" isDisabled={pending} onPress={() => void view(row)}>{labels.view}</Button> : null}
            {confirmId === row.id ? <><Button size="sm" variant="danger" isDisabled={pending} onPress={() => void revoke(row.id)}>{labels.confirm}</Button><Button size="sm" variant="tertiary" isDisabled={pending} onPress={() => setConfirmId(null)}>{labels.cancel}</Button></> : <Button size="sm" variant="tertiary" isDisabled={pending} onPress={() => setConfirmId(row.id)}>{labels.revoke}</Button>}
          </div>
        </li>)}</ul>
      )}
      {preview ? <div className="rounded-lg border border-ink-200/80 p-3" role="region" aria-label={labels.view}>
        <div className="mb-2 flex items-center justify-between"><h3 className="font-medium">{labels.view}</h3><Button size="sm" variant="tertiary" onPress={() => setPreview(null)}>{labels.close}</Button></div>
        <ul className="space-y-2">{preview.briefing.sections.flatMap((section) => section.items).map((item) => <li key={item.id} className="text-sm">{isSafeSecretaryRoute(item.href) ? <Link href={item.href} className="text-accent underline">{item.title}</Link> : item.title}</li>)}</ul>
      </div> : null}
    </section>
  );
}
