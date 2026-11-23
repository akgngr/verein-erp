"use client";

import { useState } from "react";

import { Button } from "@/shared/components/kit";
import { revokeChannelConsentAction } from "../actions/channels";
import type { ConsentView } from "../services/channels";

export type ConsentLabels = { title: string; unavailable: string; empty: string; status: Record<ConsentView["status"], string>; revoke: string; confirm: string; cancel: string; saved: string; error: string };

/** Channels have no configured delivery adapter yet: show masked state and real revoke only. */
export function SecretaryChannelConsentsPanel({ initialRows, labels }: { initialRows: ConsentView[]; labels: ConsentLabels }) {
  const [rows, setRows] = useState(initialRows);
  const [confirmChannel, setConfirmChannel] = useState<ConsentView["channel"] | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<"saved" | "error" | null>(null);
  async function revoke(channel: ConsentView["channel"]) {
    if (pending || confirmChannel !== channel) return;
    setPending(true); setMessage(null);
    try {
      const result = await revokeChannelConsentAction({ channel });
      if (!result.ok) { setMessage("error"); return; }
      setRows((current) => current.map((row) => row.channel === channel ? { ...row, status: "revoked", address: null } : row));
      setMessage("saved");
    } catch { setMessage("error"); } finally { setPending(false); setConfirmChannel(null); }
  }
  return <section aria-label={labels.title} className="space-y-3 rounded-xl border border-ink-200/80 bg-surface p-4" aria-busy={pending}>
    <h2 className="font-semibold">{labels.title}</h2><p className="text-sm text-ink-500">{labels.unavailable}</p>
    {message ? <p role={message === "error" ? "alert" : "status"} className={message === "error" ? "text-sm text-danger" : "text-sm text-success"}>{labels[message]}</p> : null}
    {rows.length === 0 ? <p className="text-sm text-ink-500">{labels.empty}</p> : <ul className="space-y-2">{rows.map((row) => <li key={row.channel} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-200/80 p-3 text-sm">
      <span>{row.channel} · {labels.status[row.status]}{row.address ? ` · ${row.address}` : ""}</span>
      {row.status !== "revoked" ? <span className="flex gap-2">{confirmChannel === row.channel ? <><Button size="sm" variant="danger" isDisabled={pending} onPress={() => void revoke(row.channel)}>{labels.confirm}</Button><Button size="sm" variant="tertiary" isDisabled={pending} onPress={() => setConfirmChannel(null)}>{labels.cancel}</Button></> : <Button size="sm" variant="tertiary" isDisabled={pending} onPress={() => setConfirmChannel(row.channel)}>{labels.revoke}</Button>}</span> : null}
    </li>)}</ul>}
  </section>;
}
