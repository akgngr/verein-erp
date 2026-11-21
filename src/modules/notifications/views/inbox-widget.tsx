"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  listNotificationsAction, markAllNotificationsReadAction, markNotificationsReadAction,
  snoozeNotificationAction, unreadNotificationCountAction,
} from "../actions/inbox";
import type { NotificationView } from "../services/inbox";
import { NotificationBellDrawer } from "../components/notification-bell-drawer";

const POLL_MS = 30_000;

/** Authenticated, server-filtered inbox; no client-side privileged database access. */
export function NotificationInboxWidget() {
  const t = useTranslations("notifications");
  const [items, setItems] = useState<NotificationView[]>([]);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // Ignore responses from older polls after a newer reload or an unmount.
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const currentRequest = ++requestId.current;
    try {
      const [list, unread] = await Promise.all([
        listNotificationsAction({ unreadOnly: false, limit: 50 }),
        unreadNotificationCountAction({}),
      ]);
      if (currentRequest !== requestId.current) return;
      if (!list.ok || !unread.ok) { setItems([]); setCount(0); setUnavailable(true); return; }
      setItems(list.data);
      setCount(unread.data.count);
      setUnavailable(false);
    } catch {
      if (currentRequest !== requestId.current) return;
      setItems([]);
      setCount(0);
      setUnavailable(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const poll = () => { if (mounted && document.visibilityState === "visible") void reload(); };
    poll();
    const interval = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      mounted = false;
      requestId.current++;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [reload]);

  const act = async (fn: () => Promise<{ ok: boolean }>) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await fn();
      if (!result.ok) { setItems([]); setCount(0); setUnavailable(true); throw new Error("NOTIFICATION_ACTION_FAILED"); }
      await reload();
    } catch {
      setItems([]);
      setCount(0);
      setUnavailable(true);
      throw new Error("NOTIFICATION_ACTION_FAILED");
    } finally {
      setBusy(false);
    }
  };

  return <NotificationBellDrawer
    labels={{
      open: t("ui.open"), heading: t("ui.heading"), all: t("ui.all"),
      unread: t("ui.unread"), empty: t("ui.empty"),
      markRead: t("ui.markRead"), markAllRead: t("ui.markAllRead"),
      snooze: t("ui.snooze"), settings: t("ui.settings"),
      unavailable: t("ui.unavailable"), module: t("ui.module"),
    }}
    unreadCount={count}
    items={items.map((item) => ({
      id: item.id, title: item.title, createdLabel: item.createdAt.slice(0, 10),
      moduleLabel: item.moduleKey, href: item.href, unread: !item.read,
    }))}
    busy={busy}
    unavailable={unavailable}
    onRead={(id) => act(() => markNotificationsReadAction({ ids: [id] }))}
    onReadAll={() => act(() => markAllNotificationsReadAction({}))}
    onSnooze={(id) => act(() => snoozeNotificationAction({
      id, until: new Date(Date.now() + 86_400_000).toISOString(),
    }))}
  />;
}
