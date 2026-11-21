"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, Input, Label, TextField } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";

import { changeFollowUpAction, createFollowUpAction, listMyFollowUpsAction } from "../actions/follow-ups";
import { isSafeSourceHref, type FollowUpCommand, type FollowUpStatus } from "../services/follow-up-policy";
import type { FollowUpView } from "../services/follow-ups";

export type FollowUpLabels = {
  heading: string; title: string; due: string; create: string; empty: string; unavailable: string;
  loading: string; saved: string; changed: string; error: string; openSource: string; retry: string;
  status: Record<FollowUpStatus, string>;
  actions: Record<FollowUpCommand, string>;
  reminders: string; cancelPrompt: string; keep: string;
};

const AVAILABLE: Record<FollowUpStatus, readonly FollowUpCommand[]> = {
  ACTIVE: ["pause", "complete", "cancel"],
  PAUSED: ["resume", "complete", "cancel"],
  EXHAUSTED: ["complete", "cancel"],
  DONE: [],
  CANCELLED: [],
};

/** Real user-scoped follow-ups; no mock data, no external message or source mutation. */
export function SecretaryFollowUps({ labels }: { labels: FollowUpLabels }) {
  const [items, setItems] = useState<FollowUpView[]>([]);
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    void listMyFollowUpsAction({ includeClosed: false }).then((result) => {
      if (!active) return;
      if (result.ok) { setItems(result.data); setLoadFailed(false); }
      else setLoadFailed(true);
    }).catch(() => { if (active) setLoadFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  async function create() {
    if (pending || !title.trim() || !dueOn) return;
    setPending("create");
    try {
      const result = await createFollowUpAction({
        sourceModule: "secretary", sourceHref: "/sekreter", title: title.trim(), dueOn, maxReminders: 3,
      });
      if (!result.ok) { notify.error(labels.error); return; }
      setItems((current) => [...current, result.data].sort((a, b) => a.dueOn.localeCompare(b.dueOn)));
      setTitle("");
      setDueOn("");
      notify.success(labels.saved);
    } catch {
      notify.error(labels.error);
    } finally {
      setPending(null);
    }
  }

  async function change(item: FollowUpView, command: FollowUpCommand) {
    if (pending || !AVAILABLE[item.status].includes(command)) return;
    if (command === "cancel" && confirmCancel !== item.id) { setConfirmCancel(item.id); return; }
    setConfirmCancel(null);
    setPending(item.id);
    try {
      const result = await changeFollowUpAction({ id: item.id, command });
      if (!result.ok) { notify.error(labels.error); return; }
      setItems((current) => current.flatMap((entry) =>
        entry.id !== item.id ? [entry] :
          result.data.status === "CANCELLED" || result.data.status === "DONE" ? [] :
          [{ ...entry, status: result.data.status }],
      ));
      notify.success(labels.changed);
    } catch {
      notify.error(labels.error);
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-label={labels.heading} className="space-y-4 rounded-xl border border-ink-200/80 p-4">
      <h2 className="text-base font-semibold">{labels.heading}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto] sm:items-end" aria-busy={pending === "create"}>
        <TextField isDisabled={pending !== null}>
          <Label>{labels.title}</Label>
          <Input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} />
        </TextField>
        <TextField isDisabled={pending !== null}>
          <Label>{labels.due}</Label>
          <Input type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} />
        </TextField>
        <Button variant="primary" isPending={pending === "create"} isDisabled={pending !== null || !title.trim() || !dueOn}
          onPress={() => void create()}>{labels.create}</Button>
      </div>
      {loading ? <p role="status" className="text-sm text-ink-500">{labels.loading}</p>
        : loadFailed ? <div role="alert" className="space-y-2"><p className="text-sm text-danger">{labels.unavailable}</p><Button variant="secondary" size="sm" onPress={() => { setLoading(true); setRefreshKey((value) => value + 1); }}>{labels.retry}</Button></div>
        : items.length === 0 ? <p className="text-sm text-ink-500">{labels.empty}</p>
        : <ul className="space-y-2" aria-busy={pending !== null}>
          {items.map((item) => (
            <li key={item.id} className="space-y-2 rounded-lg border border-ink-200/80 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium">{item.title}</p>
                  <p className="text-sm text-ink-500">{item.dueOn} · {labels.status[item.status]} · {labels.reminders}: {item.reminderCount}/{item.maxReminders}</p>
                </div>
                {isSafeSourceHref(item.sourceHref) ? <Link href={item.sourceHref} className="text-sm text-accent underline-offset-4 hover:underline focus-visible:underline">{labels.openSource}</Link> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE[item.status].map((command) => (
                  <Button key={command} variant={command === "cancel" ? "danger-soft" : "secondary"} size="sm" isDisabled={pending !== null}
                    isPending={pending === item.id} onPress={() => void change(item, command)}>{labels.actions[command]}</Button>
                ))}
                {confirmCancel === item.id ? (
                  <span role="group" aria-label={labels.cancelPrompt} className="inline-flex flex-wrap items-center gap-2">
                    <span className="text-sm">{labels.cancelPrompt}</span>
                    <Button variant="ghost" size="sm" isDisabled={pending !== null} onPress={() => setConfirmCancel(null)}>{labels.keep}</Button>
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>}
    </section>
  );
}
