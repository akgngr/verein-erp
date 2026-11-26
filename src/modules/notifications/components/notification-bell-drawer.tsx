"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";

import { Button, Sheet } from "@/shared/components/kit";

/** N1b UI-only contract. Server adapter owns all per-user filtering and mutations. */
export type NotificationDrawerItem = {
  id: string;
  title: string;
  createdLabel: string;
  moduleLabel: string;
  href: string | null;
  unread: boolean;
};
export type NotificationDrawerLabels = {
  open: string;
  heading: string;
  all: string;
  unread: string;
  empty: string;
  markRead: string;
  markAllRead: string;
  snooze: string;
  settings: string;
  unavailable: string;
  module: string;
};

import { safeNotificationHref } from "./safe-href";

export { safeNotificationHref };

/**
 * Accessible, controlled drawer shell; no demo notifications and no backend assumption.
 * Wire this only once #354 public server actions and recipient authorization are merged.
 */
export function NotificationBellDrawer({
  items, unreadCount, labels, busy = false, unavailable = false,
  onRead, onReadAll, onSnooze,
}: {
  items: readonly NotificationDrawerItem[];
  unreadCount: number;
  labels: NotificationDrawerLabels;
  busy?: boolean;
  unavailable?: boolean;
  onRead?: (id: string) => Promise<void>;
  onReadAll?: () => Promise<void>;
  onSnooze?: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("");
  const [pending, setPending] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);
  const count = unavailable ? 0 : Math.max(0, Math.floor(Number.isFinite(unreadCount) ? unreadCount : 0));
  const filtered = (unavailable ? [] : items).filter(item => (!unreadOnly || item.unread) && (!moduleFilter || item.moduleLabel === moduleFilter));
  const modules = [...new Set((unavailable ? [] : items).map(item => item.moduleLabel))].sort();

  async function act(operation: (() => Promise<void>) | undefined) {
    if (!operation || busy || pending || unavailable) return;
    setPending(true);
    setActionFailed(false);
    try { await operation(); } catch { setActionFailed(true); } finally { setPending(false); }
  }

  return (
    <>
      <Button variant="tertiary" size="sm" isIconOnly
        aria-label={count > 0 ? `${labels.open} (${count > 99 ? "99+" : count} ${labels.unread})` : labels.open}
        aria-haspopup="dialog" aria-expanded={open}
        onPress={() => setOpen(true)} className="relative">
        <Bell className="h-4 w-4" aria-hidden />
        {count > 0 ? (
          // #586: Rozet düğmenin içinde kalır; başlıktaki widget alanı (overflow-x-auto) taşan kısmı kesiyordu.
          <span aria-hidden className="pointer-events-none absolute right-0 top-0 h-4 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Button>
      <Sheet isOpen={open} onOpenChange={setOpen} placement="right" aria-label={labels.heading}>
        <Sheet.Header><Sheet.Heading>{labels.heading}</Sheet.Heading></Sheet.Header>
        <Sheet.Body>
          <div className="space-y-4" aria-busy={pending || busy}>
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {count > 0 ? `${count} ${labels.unread}` : labels.empty}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={labels.heading}>
              <Button size="sm" variant={unreadOnly ? "secondary" : "primary"}
                aria-pressed={!unreadOnly} onPress={() => setUnreadOnly(false)}>{labels.all}</Button>
              <Button size="sm" variant={unreadOnly ? "primary" : "secondary"}
                aria-pressed={unreadOnly} onPress={() => setUnreadOnly(true)}>{labels.unread}</Button>
              <Button size="sm" variant="ghost" isDisabled={!onReadAll || pending || busy || unavailable || count === 0}
                onPress={() => void act(onReadAll)}>
                <CheckCheck className="h-4 w-4" aria-hidden />{labels.markAllRead}
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span>{labels.module}</span>
              <select aria-label={labels.module} value={moduleFilter} onChange={event => setModuleFilter(event.target.value)}
                className="min-w-0 rounded-lg border border-ink-200 bg-background px-2 py-1 text-foreground">
                <option value="">{labels.all}</option>
                {modules.map(key => <option key={key} value={key}>{key}</option>)}
              </select>
            </label>
            {actionFailed && !unavailable ? <p role="alert">{labels.unavailable}</p> : null}
            {unavailable ? <p role="alert">{labels.unavailable}</p>
              : filtered.length === 0 ? <p role="status" className="text-sm text-ink-500">{labels.empty}</p>
              : (
                <ul className="space-y-2" aria-live="polite">
                  {filtered.map(item => (
                    <li key={item.id} className="rounded-lg border border-ink-200/80 p-3">
                      <p className="text-xs text-ink-500">
                        {item.unread ? <span className="sr-only">[{labels.unread}] </span> : null}
                        {item.moduleLabel} · {item.createdLabel}
                      </p>
                      <p className="break-words text-sm font-medium">
                        {item.unread ? <span className="sr-only">[{labels.unread}] </span> : null}
                        {item.title}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {safeNotificationHref(item.href) ?
                          <Link href={item.href} aria-label={`${labels.open}: ${item.title}`} className="text-sm text-accent underline-offset-4 hover:underline focus-visible:underline"
                            onClick={() => setOpen(false)}>{labels.open}</Link> : null}
                        {item.unread ? <Button size="sm" variant="ghost" aria-label={`${labels.markRead}: ${item.title}`} isDisabled={!onRead || pending || busy || unavailable}
                          onPress={() => void act(onRead ? () => onRead(item.id) : undefined)}>{labels.markRead}</Button> : null}
                        <Button size="sm" variant="ghost" aria-label={`${labels.snooze}: ${item.title}`} isDisabled={!onSnooze || pending || busy || unavailable}
                          onPress={() => void act(onSnooze ? () => onSnooze(item.id) : undefined)}>{labels.snooze}</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </Sheet.Body>
        <Sheet.Footer><Link className="text-sm text-accent underline-offset-4 hover:underline focus-visible:underline" href="/ayarlar/bildirimler">{labels.settings}</Link></Sheet.Footer>
      </Sheet>
    </>
  );
}
